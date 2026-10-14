"""Bounded, resumable public-site verification. No AI, billing or email writes.

Only reviewed CHECKS can run. Remote pages and the status issue are data, never
instructions. SQLite is durable only on a persistent filesystem; GitHub mode
restores/checkpoints a strict, public-only snapshot in one existing issue.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sqlite3
import time
import sys
import urllib.error
import urllib.parse
import urllib.request
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

VERSION = 1
REPOSITORY = "LBSconnect/Easy-Pass"
MARKER = "<!-- three-site-operations:v1 -->"
MAX_ATTEMPTS = 3
LEASE_SECONDS = 90
MAX_BODY = 1024 * 1024
MAX_JOBS = 96
STATES = {"queued", "running", "retry", "verified", "attention", "exhausted"}
OUTCOMES = {"passed", "attention", "unavailable"}
HOSTS = {"www.myeasypass.net", "myeasypass.net", "www.workabeez.net",
         "workabeez.net", "www.seanaustinmusic.com", "seanaustinmusic.com"}


@dataclass(frozen=True)
class Check:
    id: str
    role: str
    url: str
    expected_status: int = 200
    contains: tuple[str, ...] = ()
    absent: tuple[str, ...] = ()
    redirect_to: str = ""


CHECKS = (
    Check("mep_home", "availability", "https://www.myeasypass.net/"),
    Check("mep_redirect", "deployment", "https://www.myeasypass.net/schedule-exam",
          301, redirect_to="https://www.myeasypass.net/free/study-resources"),
    Check("mep_sitemap", "seo", "https://www.myeasypass.net/sitemap.xml", 200,
          ("/free/study-resources",), ("/schedule-exam",)),
    Check("mep_free_test", "seo", "https://www.myeasypass.net/free/texas-real-estate-practice-test",
          200, ("Free Texas Real Estate Practice Test",)),
    Check("wab_home", "availability", "https://www.workabeez.net/"),
    Check("wab_trial_copy", "conversion", "https://www.workabeez.net/pricing", 200,
          ("30-day", "$79"), ("14-day", "first 14 days", "Upgrade only when")),
    Check("music_home", "availability", "https://www.seanaustinmusic.com/"),
    Check("music_merch", "conversion", "https://www.seanaustinmusic.com/merch"),
)
BY_ID = {check.id: check for check in CHECKS}
POLICY = hashlib.sha256(repr(CHECKS).encode()).hexdigest()[:16]


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def validate_url(url: str) -> str:
    parsed = urllib.parse.urlsplit(url)
    if (parsed.scheme != "https" or parsed.hostname not in HOSTS or parsed.port not in (None, 443)
            or parsed.username or parsed.password or parsed.query or parsed.fragment):
        raise ValueError("public_url_not_allowed")
    return url


def get_public(url: str) -> tuple[int, dict, bytes]:
    validate_url(url)
    request = urllib.request.Request(url, headers={
        "User-Agent": "ThreeSiteOperations/1.0", "Cache-Control": "no-cache",
        "Accept": "text/html,application/xml,text/xml;q=0.9,*/*;q=0.1",
    })
    opener = urllib.request.build_opener(NoRedirect())
    try:
        response = opener.open(request, timeout=10)
    except urllib.error.HTTPError as error:
        response = error  # HTTP errors are evidence, not transport success.
    with response:
        return response.status, dict(response.headers), response.read(MAX_BODY + 1)


def observe(check: Check, fetch: Callable = get_public) -> dict:
    """Return fixed fields only: never log page text, cookies or credentials."""
    url = check.url
    seen = set()
    for _ in range(4):
        validate_url(url)
        if url in seen:
            raise ValueError("redirect_loop")
        seen.add(url)
        status, headers, body = fetch(url)
        headers = {key.lower(): value for key, value in headers.items()}
        if check.redirect_to:
            target = urllib.parse.urljoin(url, headers.get("location", ""))
            signals = {"http_status": status == check.expected_status,
                       "redirect_target": target == check.redirect_to}
            return result(status, signals, body)
        if status in (301, 302, 303, 307, 308):
            if not headers.get("location"):
                return result(status, {"redirect_target": False}, body)
            url = urllib.parse.urljoin(url, headers["location"])
            continue  # Every destination is checked before a request.
        text = body[:MAX_BODY].decode("utf-8", errors="replace").casefold()
        signals = {"http_status": status == check.expected_status,
                   "bounded_response": len(body) <= MAX_BODY}
        for index, needle in enumerate(check.contains):
            signals[f"required_{index}"] = needle.casefold() in text
        for index, needle in enumerate(check.absent):
            signals[f"retired_{index}"] = needle.casefold() not in text
        return result(status, signals, body)
    raise ValueError("redirect_limit")


def result(status: int, signals: dict, body: bytes) -> dict:
    return {"outcome": "passed" if all(signals.values()) else "attention",
            "http_status": status, "signals": signals,
            "body_sha256": hashlib.sha256(body[:MAX_BODY]).hexdigest(), "error": ""}


def clean_evidence(value: object) -> dict:
    if not isinstance(value, dict) or value.get("outcome") not in OUTCOMES:
        raise ValueError("invalid_evidence")
    status = value.get("http_status")
    if status is not None and (type(status) is not int or not 100 <= status <= 599):
        raise ValueError("invalid_http_status")
    signals = value.get("signals", {})
    if not isinstance(signals, dict) or len(signals) > 12:
        raise ValueError("invalid_signals")
    for key, flag in signals.items():
        if not re.fullmatch(r"(?:http_status|bounded_response|redirect_target|required_[0-9]|retired_[0-9])", key) or type(flag) is not bool:
            raise ValueError("invalid_signal")
    digest = value.get("body_sha256", "")
    if digest and not re.fullmatch(r"[a-f0-9]{64}", digest):
        raise ValueError("invalid_digest")
    code = value.get("error", "")
    if code not in ("", "network_unavailable", "public_url_not_allowed", "redirect_loop", "redirect_limit"):
        raise ValueError("invalid_error_code")
    return {"outcome": value["outcome"], "http_status": status,
            "signals": signals, "body_sha256": digest, "error": code}


class Store:
    def __init__(self, path: str):
        self.db = sqlite3.connect(path, timeout=15, isolation_level=None)
        self.db.row_factory = sqlite3.Row
        self.db.execute("PRAGMA busy_timeout=15000")
        self.db.execute("""CREATE TABLE IF NOT EXISTS jobs (
          id TEXT PRIMARY KEY, check_id TEXT NOT NULL, period INTEGER NOT NULL,
          state TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0,
          due INTEGER NOT NULL, lease TEXT, lease_until INTEGER,
          observed INTEGER, evidence TEXT)""")

    def close(self):
        self.db.close()

    def enqueue(self, now: int):
        period = now // 3600
        for check in CHECKS:
            self.db.execute("INSERT OR IGNORE INTO jobs(id,check_id,period,state,due) VALUES(?,?,?,?,?)",
                            (f"{POLICY}:{period}:{check.id}", check.id, period, "queued", now))
        # Keep recent bounded evidence, not a growing log of pages or customers.
        self.db.execute("DELETE FROM jobs WHERE period < ?", (period - 5,))

    def claim(self, now: int):
        self.db.execute("BEGIN IMMEDIATE")
        try:
            self.db.execute("""UPDATE jobs SET state=CASE WHEN attempts>=? THEN 'exhausted' ELSE 'retry' END,
              lease=NULL, lease_until=NULL, due=? WHERE state='running' AND lease_until<=?""",
                            (MAX_ATTEMPTS, now, now))
            row = self.db.execute("""SELECT * FROM jobs WHERE state IN ('queued','retry')
              AND due<=? AND attempts<? ORDER BY period,due,id LIMIT 1""", (now, MAX_ATTEMPTS)).fetchone()
            if row is None:
                self.db.execute("COMMIT")
                return None
            lease = uuid.uuid4().hex
            self.db.execute("UPDATE jobs SET state='running',attempts=attempts+1,lease=?,lease_until=? WHERE id=?",
                            (lease, now + LEASE_SECONDS, row["id"]))
            self.db.execute("COMMIT")
            return {**dict(row), "lease": lease, "attempts": row["attempts"] + 1}
        except Exception:
            self.db.execute("ROLLBACK")
            raise

    def finish(self, job: dict, evidence: dict, now: int):
        evidence = clean_evidence(evidence)
        outcome = evidence["outcome"]
        state = "verified" if outcome == "passed" else "attention"
        if outcome == "unavailable":
            state = "retry" if job["attempts"] < MAX_ATTEMPTS else "exhausted"
        due = now + min(300, 30 * 2 ** (job["attempts"] - 1))
        cursor = self.db.execute("""UPDATE jobs SET state=?,due=?,observed=?,evidence=?,lease=NULL,lease_until=NULL
          WHERE id=? AND state='running' AND lease=? AND lease_until>?""",
                                (state, due, now, json.dumps(evidence), job["id"], job["lease"], now))
        if cursor.rowcount != 1:
            raise RuntimeError("stale_lease_result_rejected")

    def snapshot(self, now: int) -> dict:
        rows = self.db.execute("SELECT * FROM jobs ORDER BY period DESC,id LIMIT ?", (MAX_JOBS,)).fetchall()
        records = []
        for row in rows:
            item = {key: row[key] for key in ("check_id", "period", "state", "attempts", "due", "observed")}
            item["evidence"] = json.loads(row["evidence"]) if row["evidence"] else None
            # A terminated runner must never export a live worker lease.
            if item["state"] == "running":
                item["state"] = "retry" if item["attempts"] < MAX_ATTEMPTS else "exhausted"
            records.append(item)
        periods = {item["period"] for item in records}
        completed_cycles = []
        for period in periods:
            cycle = [item for item in records if item["period"] == period]
            if (len({item["check_id"] for item in cycle}) == len(CHECKS)
                    and all(item["state"] in {"verified", "attention", "exhausted"}
                            and item["observed"] is not None for item in cycle)):
                completed_cycles.append(max(item["observed"] for item in cycle))
        return {"version": VERSION, "policy": POLICY, "updated_at": now,
                "last_completed_cycle": max(completed_cycles, default=None), "records": records}

    def restore(self, snapshot: object, now: int):
        records = validate_snapshot(snapshot, now)
        self.db.execute("BEGIN IMMEDIATE")
        try:
            for item in records:
                self.db.execute("""INSERT OR IGNORE INTO jobs
                  (id,check_id,period,state,attempts,due,observed,evidence) VALUES(?,?,?,?,?,?,?,?)""",
                                (f"{POLICY}:{item['period']}:{item['check_id']}", item["check_id"], item["period"],
                                 item["state"], item["attempts"], item["due"], item["observed"],
                                 json.dumps(item["evidence"]) if item["evidence"] else None))
            self.db.execute("COMMIT")
        except Exception:
            self.db.execute("ROLLBACK")
            raise


def validate_snapshot(snapshot: object, now: int) -> list:
    if not isinstance(snapshot, dict) or snapshot.get("version") != VERSION:
        raise ValueError("invalid_snapshot")
    if type(snapshot.get("updated_at")) is not int or not 0 <= snapshot["updated_at"] <= now + 60:
        raise ValueError("invalid_checkpoint_time")
    if snapshot.get("policy") != POLICY:
        return []  # A reviewed check change cannot inherit stale success.
    records = snapshot.get("records")
    if not isinstance(records, list) or len(records) > MAX_JOBS:
        raise ValueError("invalid_records")
    clean = []
    seen = set()
    for item in records:
        if not isinstance(item, dict) or item.get("check_id") not in BY_ID or item.get("state") not in STATES - {"running"}:
            raise ValueError("invalid_record")
        for key in ("period", "attempts", "due"):
            if type(item.get(key)) is not int or not 0 <= item[key] <= 10**11:
                raise ValueError("invalid_integer")
        key = (item["check_id"], item["period"])
        if key in seen:
            raise ValueError("duplicate_record")
        seen.add(key)
        if item["attempts"] > MAX_ATTEMPTS or item["due"] > now + 3600 or item["period"] > now // 3600:
            raise ValueError("invalid_time_or_attempts")
        if item.get("observed") is not None and (type(item["observed"]) is not int or not 0 <= item["observed"] <= now + 60):
            raise ValueError("invalid_observed")
        evidence = clean_evidence(item["evidence"]) if item.get("evidence") is not None else None
        if item["state"] == "verified" and (not evidence or evidence["outcome"] != "passed"
                or evidence["http_status"] != BY_ID[item["check_id"]].expected_status
                or not evidence["signals"] or not all(evidence["signals"].values())
                or not evidence["body_sha256"] or item.get("observed") is None):
            raise ValueError("success_without_evidence")
        if item["period"] >= now // 3600 - 5:
            clean.append({**{key: item[key] for key in ("check_id", "period", "state", "attempts", "due")},
                          "observed": item.get("observed"), "evidence": evidence})
    return clean


def run_ready(store: Store, clock: Callable = time.time, fetch: Callable = get_public,
              checkpoint: Callable | None = None, limit: int = 24):
    completed = 0
    for _ in range(limit):
        now = int(clock())
        job = store.claim(now)
        if job is None:
            break
        try:
            evidence = observe(BY_ID[job["check_id"]], fetch)
        except (urllib.error.URLError, TimeoutError, OSError):
            evidence = {"outcome": "unavailable", "http_status": None, "signals": {},
                        "body_sha256": "", "error": "network_unavailable"}
        except ValueError as error:
            code = str(error)
            if code not in ("public_url_not_allowed", "redirect_loop", "redirect_limit"):
                raise
            evidence = {"outcome": "attention", "http_status": None, "signals": {},
                        "body_sha256": "", "error": code}
        store.finish(job, evidence, int(clock()))
        completed += 1
        if checkpoint:
            checkpoint(store.snapshot(int(clock())))
    return completed


class GitHubLedger:
    def __init__(self, issue: int, token: str):
        if issue <= 0 or not token:
            raise ValueError("issue_and_runtime_token_required")
        self.issue, self.token = issue, token

    def request(self, method: str, payload=None):
        url = f"https://api.github.com/repos/{REPOSITORY}/issues/{self.issue}"
        req = urllib.request.Request(url, method=method,
              data=json.dumps(payload).encode() if payload is not None else None,
              headers={"Authorization": f"Bearer {self.token}", "Accept": "application/vnd.github+json",
                       "Content-Type": "application/json", "User-Agent": "ThreeSiteOperations/1.0"})
        # Never follow redirects with an Authorization header.
        with urllib.request.build_opener(NoRedirect()).open(req, timeout=15) as response:
            data = response.read(128 * 1024 + 1)
        if len(data) > 128 * 1024:
            raise ValueError("ledger_response_too_large")
        return json.loads(data)

    def read(self, now: int):
        issue = self.request("GET")
        if issue.get("pull_request") or issue.get("state") != "open":
            raise ValueError("ledger_not_open_issue")
        body = issue.get("body") or ""
        if MARKER not in body:
            raise ValueError("ledger_marker_missing")
        if "```json\n" not in body:
            return None  # Newly provisioned status record, not a success claim.
        encoded = body.split("```json\n", 1)[1].split("\n```", 1)[0]
        snapshot = json.loads(encoded)
        validate_snapshot(snapshot, now)
        return snapshot

    def write(self, snapshot: dict):
        validate_snapshot(snapshot, int(time.time()))
        self.request("PATCH", {"body": render_report(snapshot, include_snapshot=True)})


def render_report(snapshot: dict, include_snapshot=False) -> str:
    now = snapshot["updated_at"]
    latest = {}
    for item in sorted(snapshot["records"], key=lambda row: row["period"], reverse=True):
        latest.setdefault(item["check_id"], item)
    lines = [MARKER, "# Three-site public operations monitor", "",
             "Public verification only. No financial/customer records, email sends, billing changes, or AI API calls.",
             "A passed check is an observation, not a deployment, sale, successful checkout, or independent proof of Google indexing.",
             "", f"Last checkpoint (UTC): {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(now))}", "",
             "| Check | Role | State | HTTP | Observed UTC |", "|---|---|---|---|---|"]
    for check in CHECKS:
        item = latest.get(check.id, {})
        evidence = item.get("evidence") or {}
        observed = item.get("observed")
        timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(observed)) if observed is not None else "not observed"
        lines.append(f"| {check.id} | {check.role} | {item.get('state', 'not run')} | {evidence.get('http_status', '-')} | {timestamp} |")
    lines += ["", "Attention means the reviewed expectation did not match. Exhausted means three read attempts failed, not that the site is proven down.",
              "Closing this issue is a kill switch: the next hosted run stops before checking sites."]
    if include_snapshot:
        lines += ["", "## Bounded public-only checkpoint", "```json", json.dumps(snapshot, separators=(",", ":")), "```"]
    return "\n".join(lines) + "\n"


def heartbeat_age(snapshot: dict | None, now: int) -> int | None:
    if not snapshot:
        return None
    validated = Store(":memory:")
    try:
        validated.restore(snapshot, now)
        completed = validated.snapshot(now)["last_completed_cycle"]
        return now - completed if completed is not None else None
    finally:
        validated.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--watchdog", action="store_true", help="Read-only stale-run check; does not run site checks")
    parser.add_argument("--db", default="operations.sqlite3")
    parser.add_argument("--network", action="store_true", help="Permit reviewed public GET checks")
    parser.add_argument("--github-issue", type=int, help="Use an existing marked status issue for checkpoints")
    parser.add_argument("--report", help="Write a public-only Markdown report")
    parser.add_argument("--loop-seconds", type=int, default=0, help="Private persistent-host mode; not for ephemeral runners")
    args = parser.parse_args()
    if not args.network and not args.watchdog:
        parser.error("No action taken. Use --network to authorize the fixed public read checks.")
    if args.loop_seconds and args.loop_seconds < 60:
        parser.error("Polling interval must be at least 60 seconds.")
    if args.github_issue and os.environ.get("GITHUB_REPOSITORY") != REPOSITORY:
        parser.error("Hosted ledger mode requires the exact authorized repository.")
    ledger = GitHubLedger(args.github_issue, os.environ.get("GITHUB_TOKEN", "")) if args.github_issue else None
    if args.watchdog:
        if not ledger:
            parser.error("Watchdog requires --github-issue.")
        age = heartbeat_age(ledger.read(int(time.time())), int(time.time()))
        if age is None or age > 3 * 3600:
            raise RuntimeError("No completed verification cycle in the last three hours.")
        print(f"Verification heartbeat age: {age} seconds. This is not a revenue result.")
        return
    store = Store(args.db)
    try:
        while True:
            if os.environ.get("OPS_STOP") == "1":
                break
            now = int(time.time())
            previous = ledger.read(now) if ledger else None
            if previous:
                store.restore(previous, now)
                if now - previous.get("updated_at", 0) > 3 * 3600:
                    print("Previous heartbeat was more than three hours old; continuity is not proven.")
            store.enqueue(now)
            if ledger:
                ledger.write(store.snapshot(now))
            run_ready(store, checkpoint=ledger.write if ledger else None)
            snapshot = store.snapshot(int(time.time()))
            if ledger:
                ledger.write(snapshot)
            report = render_report(snapshot)
            print(report)
            if args.report:
                Path(args.report).write_text(report, encoding="utf-8")
            if not args.loop_seconds:
                break
            time.sleep(args.loop_seconds)
    finally:
        store.close()


if __name__ == "__main__":
    try:
        main()
    except (urllib.error.URLError, OSError, ValueError, RuntimeError):
        # Keep provider response content and token-bearing request objects out of logs.
        print("Operations stopped: connection, policy, ledger, lease or heartbeat check failed. Review the last public checkpoint.", file=sys.stderr)
        raise SystemExit(1)
