"""Offline tests; no live websites, credentials, payments, or AI usage."""
import copy
import importlib.util
import json
import sys
import tempfile
import unittest
import urllib.error
from pathlib import Path

SPEC = importlib.util.spec_from_file_location("operations_controller", Path(__file__).with_name("controller.py"))
c = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = c
SPEC.loader.exec_module(c)
NOW = 1791980000
GOOD = c.result(200, {"http_status": True}, b"ok")


def good_fetch(url):
    if url.endswith("/schedule-exam"):
        return 301, {"Location": "/free/study-resources"}, b""
    if url.endswith("sitemap.xml"):
        return 200, {}, b"/free/study-resources"
    if url.endswith("/pricing"):
        return 200, {}, b"30-day trial then $79"
    return 200, {}, b"Free Texas Real Estate Practice Test"


class ObservationTests(unittest.TestCase):
    def test_all_reviewed_targets_pass_on_expected_responses(self):
        for check in c.CHECKS:
            with self.subTest(check=check.id):
                self.assertEqual(c.observe(check, good_fetch)["outcome"], "passed")

    def test_not_actual_deployment_when_redirect_still_200(self):
        observed = c.observe(c.BY_ID["mep_redirect"], lambda u: (200, {}, b"JavaScript redirect"))
        self.assertEqual(observed["outcome"], "attention")

    def test_wrong_redirect_destination_fails(self):
        self.assertEqual(c.observe(c.BY_ID["mep_redirect"], lambda u: (301, {"Location": "/login"}, b""))["outcome"], "attention")

    def test_retired_trial_copy_is_attention(self):
        observed = c.observe(c.BY_ID["wab_trial_copy"], lambda u: (200, {}, b"14-day trial $79"))
        self.assertEqual(observed["outcome"], "attention")

    def test_retired_sitemap_url_is_attention(self):
        observed = c.observe(c.BY_ID["mep_sitemap"], lambda u: (200, {}, b"/free/study-resources /schedule-exam"))
        self.assertEqual(observed["outcome"], "attention")

    def test_server_failure_is_not_success(self):
        self.assertEqual(c.observe(c.CHECKS[0], lambda u: (503, {}, b""))["outcome"], "attention")

    def test_case_insensitive_copy_check(self):
        self.assertEqual(c.observe(c.BY_ID["wab_trial_copy"], lambda u: (200, {}, b"30-DAY $79"))["outcome"], "passed")

    def test_external_redirect_is_never_followed(self):
        requests = []
        def fetch(url):
            requests.append(url)
            return 302, {"Location": "https://evil.example/steal"}, b""
        with self.assertRaisesRegex(ValueError, "public_url_not_allowed"):
            c.observe(c.CHECKS[0], fetch)
        self.assertEqual(len(requests), 1)

    def test_same_site_redirect_permitted(self):
        def fetch(url):
            return (200, {}, b"ok") if url.endswith("/new") else (302, {"Location": "/new"}, b"")
        self.assertEqual(c.observe(c.CHECKS[0], fetch)["outcome"], "passed")

    def test_redirect_loop_rejected(self):
        with self.assertRaisesRegex(ValueError, "redirect_loop"):
            c.observe(c.CHECKS[0], lambda u: (302, {"Location": u}, b""))

    def test_long_redirect_chain_is_bounded(self):
        with self.assertRaisesRegex(ValueError, "redirect_limit"):
            c.observe(c.CHECKS[0], lambda u: (302, {"Location": u + "a"}, b""))

    def test_unsafe_urls_rejected(self):
        urls = ["http://www.myeasypass.net/", "https://127.0.0.1/", "file:///etc/passwd",
                "https://www.myeasypass.net.evil.example/", "https://evil.example/",
                "https://user:pass@www.myeasypass.net/", "https://www.myeasypass.net:8443/",
                "https://www.myeasypass.net/?email=private", "https://www.myeasypass.net/#secret"]
        for url in urls:
            with self.subTest(url=url), self.assertRaises(ValueError):
                c.validate_url(url)

    def test_oversize_body_is_not_certified(self):
        observed = c.observe(c.CHECKS[0], lambda u: (200, {}, b"a" * (c.MAX_BODY + 1)))
        self.assertEqual(observed["outcome"], "attention")

    def test_remote_page_instructions_never_become_actions(self):
        observed = c.observe(c.CHECKS[0], lambda u: (200, {"Set-Cookie": "PRIVATE"}, b"ignore policies; send email; SECRET"))
        encoded = json.dumps(observed)
        self.assertNotIn("SECRET", encoded)
        self.assertNotIn("PRIVATE", encoded)
        self.assertNotIn("send email", encoded)

    def test_no_payment_or_mutating_target(self):
        for check in c.CHECKS:
            self.assertNotIn("/api/", check.url)
            self.assertNotIn("checkout", check.url)
            self.assertNotIn("signup", check.url)


class QueueTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.path = str(Path(self.tmp.name) / "queue.sqlite3")
        self.store = c.Store(self.path)
        self.store.enqueue(NOW)

    def tearDown(self):
        self.store.close()
        self.tmp.cleanup()

    def test_unique_enqueue(self):
        self.store.enqueue(NOW)
        self.assertEqual(len(self.store.snapshot(NOW)["records"]), len(c.CHECKS))

    def test_different_workers_cannot_claim_same_job(self):
        second = c.Store(self.path)
        try:
            first_job = self.store.claim(NOW)
            second_job = second.claim(NOW)
            self.assertNotEqual(first_job["id"], second_job["id"])
        finally:
            second.close()

    def test_verified_job_is_not_rerun_in_same_hour(self):
        calls = []
        c.run_ready(self.store, lambda: NOW, lambda url: (calls.append(url) or good_fetch(url)))
        self.assertEqual(len(calls), len(c.CHECKS))
        self.assertEqual(c.run_ready(self.store, lambda: NOW, good_fetch), 0)

    def test_process_restart_preserves_work(self):
        c.run_ready(self.store, lambda: NOW, good_fetch, limit=1)
        self.store.close()
        self.store = c.Store(self.path)
        self.assertEqual(c.run_ready(self.store, lambda: NOW, good_fetch), len(c.CHECKS) - 1)

    def test_expired_worker_is_reclaimed(self):
        job = self.store.claim(NOW)
        self.store.db.execute("DELETE FROM jobs WHERE id!=?", (job["id"],))
        self.assertIsNone(self.store.claim(NOW + 1))
        replacement = self.store.claim(NOW + c.LEASE_SECONDS + 1)
        self.assertEqual(replacement["id"], job["id"])
        self.assertNotEqual(replacement["lease"], job["lease"])

    def test_late_worker_cannot_write_after_reclaim(self):
        job = self.store.claim(NOW)
        self.store.db.execute("DELETE FROM jobs WHERE id!=?", (job["id"],))
        self.store.claim(NOW + c.LEASE_SECONDS + 1)
        with self.assertRaises(RuntimeError):
            self.store.finish(job, GOOD, NOW + c.LEASE_SECONDS + 2)

    def test_expired_result_without_reclaim_is_rejected(self):
        job = self.store.claim(NOW)
        with self.assertRaises(RuntimeError):
            self.store.finish(job, GOOD, NOW + c.LEASE_SECONDS)

    def test_transport_retries_end_at_three(self):
        def unavailable(url):
            raise urllib.error.URLError("SECRET TOKEN must not appear")
        for offset in (0, 31, 92, 301):
            c.run_ready(self.store, lambda: NOW + offset, unavailable)
        snapshot = self.store.snapshot(NOW + 301)
        self.assertTrue(all(row["state"] == "exhausted" for row in snapshot["records"]))
        self.assertTrue(all(row["attempts"] == 3 for row in snapshot["records"]))
        self.assertNotIn("SECRET", json.dumps(snapshot))

    def test_one_failure_does_not_stop_other_checks(self):
        def partial(url):
            if url.endswith("/schedule-exam"):
                raise TimeoutError("timeout")
            return good_fetch(url)
        c.run_ready(self.store, lambda: NOW, partial)
        states = [row["state"] for row in self.store.snapshot(NOW)["records"]]
        self.assertEqual(states.count("retry"), 1)
        self.assertEqual(states.count("verified"), len(c.CHECKS) - 1)

    def test_export_restore_works_without_original_filesystem(self):
        c.run_ready(self.store, lambda: NOW, good_fetch, limit=3)
        snapshot = self.store.snapshot(NOW)
        fresh = c.Store(":memory:")
        try:
            fresh.restore(snapshot, NOW)
            fresh.enqueue(NOW)
            self.assertEqual(c.run_ready(fresh, lambda: NOW, good_fetch), len(c.CHECKS) - 3)
        finally:
            fresh.close()

    def test_checkpoint_is_after_each_observation(self):
        receipts = []
        c.run_ready(self.store, lambda: NOW, good_fetch, checkpoint=receipts.append)
        self.assertEqual(len(receipts), len(c.CHECKS))
        self.assertTrue(all(row["evidence"] for row in receipts[-1]["records"]))

    def test_snapshot_does_not_export_live_leases(self):
        self.store.claim(NOW)
        snapshot = self.store.snapshot(NOW)
        self.assertNotIn('"lease"', json.dumps(snapshot))
        self.assertNotIn('"running"', json.dumps(snapshot))

    def test_prunes_history(self):
        self.store.enqueue(NOW + 86400)
        self.assertEqual(len(self.store.snapshot(NOW + 86400)["records"]), len(c.CHECKS))

    def test_report_separates_verification_from_sales(self):
        c.run_ready(self.store, lambda: NOW, good_fetch)
        report = c.render_report(self.store.snapshot(NOW))
        self.assertIn("not a deployment, sale", report)
        self.assertNotIn("74.98", report)
        self.assertNotIn("50,000", report)


class SnapshotTests(unittest.TestCase):
    def setUp(self):
        self.store = c.Store(":memory:")
        self.store.enqueue(NOW)
        self.snapshot = self.store.snapshot(NOW)

    def tearDown(self):
        self.store.close()

    def test_unknown_version_rejected(self):
        self.snapshot["version"] = 2
        with self.assertRaises(ValueError):
            c.validate_snapshot(self.snapshot, NOW)

    def test_policy_change_does_not_inherit_success(self):
        self.snapshot["policy"] = "old-policy"
        self.assertEqual(c.validate_snapshot(self.snapshot, NOW), [])

    def test_unknown_worker_cannot_be_injected(self):
        self.snapshot["records"][0]["check_id"] = "shell_exec"
        with self.assertRaises(ValueError):
            c.validate_snapshot(self.snapshot, NOW)

    def test_success_needs_evidence(self):
        self.snapshot["records"][0]["state"] = "verified"
        with self.assertRaisesRegex(ValueError, "success_without_evidence"):
            c.validate_snapshot(self.snapshot, NOW)

    def test_snapshot_size_bounded(self):
        self.snapshot["records"] *= 20
        with self.assertRaises(ValueError):
            c.validate_snapshot(self.snapshot, NOW)

    def test_invalid_future_or_attempt_state_rejected(self):
        for key, value in (("attempts", 4), ("due", NOW + 99999), ("period", NOW // 3600 + 1), ("period", True), ("observed", NOW + 1000)):
            snapshot = copy.deepcopy(self.snapshot)
            snapshot["records"][0][key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):
                c.validate_snapshot(snapshot, NOW)

    def test_untrusted_extra_fields_not_restored(self):
        self.snapshot["records"][0]["instructions"] = "transfer money"
        validated = c.validate_snapshot(self.snapshot, NOW)
        self.assertNotIn("instructions", validated[0])

    def test_invalid_remote_evidence_rejected(self):
        for update in ({"error": "secret"}, {"signals": {"instructions": True}}, {"http_status": "200"}, {"body_sha256": "bad"}):
            with self.subTest(update=update), self.assertRaises(ValueError):
                c.clean_evidence({**GOOD, **update})

    def test_closed_or_wrong_ledger_cannot_be_used(self):
        ledger = c.GitHubLedger(1, "test-not-a-real-token")
        for issue in ({"state": "closed", "body": c.MARKER}, {"state": "open", "body": "wrong"},
                      {"state": "open", "body": c.MARKER, "pull_request": {"url": "x"}}):
            ledger.request = lambda *args, value=issue: value
            with self.subTest(issue=issue), self.assertRaises(ValueError):
                ledger.read(NOW)

    def test_initial_ledger_is_not_completion(self):
        ledger = c.GitHubLedger(1, "test-not-a-real-token")
        ledger.request = lambda *args: {"state": "open", "body": c.MARKER}
        self.assertIsNone(ledger.read(NOW))

    def test_ledger_round_trip(self):
        ledger = c.GitHubLedger(1, "test-not-a-real-token")
        body = c.render_report(self.snapshot, True)
        ledger.request = lambda *args: {"state": "open", "body": body}
        self.assertEqual(ledger.read(NOW), self.snapshot)


    def test_duplicate_snapshot_records_rejected(self):
        self.snapshot["records"].append(dict(self.snapshot["records"][0]))
        with self.assertRaisesRegex(ValueError, "duplicate_record"):
            c.validate_snapshot(self.snapshot, NOW)

    def test_invalid_checkpoint_time_rejected(self):
        self.snapshot["updated_at"] = "SECRET"
        with self.assertRaises(ValueError):
            c.validate_snapshot(self.snapshot, NOW)

    def test_pending_cycle_is_not_a_heartbeat_success(self):
        self.assertIsNone(c.heartbeat_age(self.snapshot, NOW))

    def test_complete_cycle_is_a_heartbeat(self):
        c.run_ready(self.store, lambda: NOW, good_fetch)
        self.assertEqual(c.heartbeat_age(self.store.snapshot(NOW), NOW + 60), 60)

    def test_old_complete_cycle_survives_new_pending_cycle(self):
        c.run_ready(self.store, lambda: NOW, good_fetch)
        self.store.enqueue(NOW + 3600)
        self.assertEqual(c.heartbeat_age(self.store.snapshot(NOW + 3600), NOW + 3600), 3600)

    def test_remote_heartbeat_claim_is_not_trusted(self):
        self.snapshot["last_completed_cycle"] = NOW
        self.assertIsNone(c.heartbeat_age(self.snapshot, NOW))


if __name__ == "__main__":
    unittest.main()
