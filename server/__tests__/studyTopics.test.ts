import { describe, it, expect } from 'vitest';
import { getTopicById, getTopicsByCategory, studyTopicsConfig } from '../../shared/studyTopics';

describe('getTopicById', () => {
  it('finds a real estate topic by ID', () => {
    const result = getTopicById('re_contracts');
    expect(result).toBeDefined();
    expect(result!.topic.id).toBe('re_contracts');
    expect(result!.topic.nameEn).toBe('Real Estate Contracts');
    expect(result!.category.category).toBe('real_estate');
  });

  it('finds a property casualty topic by ID', () => {
    const result = getTopicById('pc_property');
    expect(result).toBeDefined();
    expect(result!.topic.id).toBe('pc_property');
    expect(result!.category.category).toBe('property_casualty');
  });

  it('finds a life insurance topic by ID', () => {
    const result = getTopicById('li_policies');
    expect(result).toBeDefined();
    expect(result!.topic.id).toBe('li_policies');
    expect(result!.category.category).toBe('life_insurance');
  });

  it('finds a general lines topic by ID', () => {
    const result = getTopicById('gl_commercial');
    expect(result).toBeDefined();
    expect(result!.topic.id).toBe('gl_commercial');
    expect(result!.category.category).toBe('general_lines');
  });

  it('returns undefined for non-existent topic ID', () => {
    const result = getTopicById('nonexistent_topic');
    expect(result).toBeUndefined();
  });

  it('returns undefined for empty string', () => {
    const result = getTopicById('');
    expect(result).toBeUndefined();
  });

  it('returns correct category context with the topic', () => {
    const result = getTopicById('re_financing');
    expect(result).toBeDefined();
    expect(result!.category.nameEn).toBe('Real Estate');
    expect(result!.category.nameEs).toBe('Bienes Raices');
    expect(result!.category.topics.length).toBeGreaterThan(0);
  });

  it('returns topic with both English and Spanish names', () => {
    const result = getTopicById('pc_auto');
    expect(result).toBeDefined();
    expect(result!.topic.nameEn).toBe('Auto Insurance');
    expect(result!.topic.nameEs).toBe('Seguro de Auto');
  });

  it('returns topic with questionCount', () => {
    const result = getTopicById('gl_ethics');
    expect(result).toBeDefined();
    expect(result!.topic.questionCount).toBe(46);
  });
});

describe('getTopicsByCategory', () => {
  it('returns topics for real_estate category', () => {
    const topics = getTopicsByCategory('real_estate');
    expect(topics.length).toBe(5);
    expect(topics[0].id).toBe('re_contracts');
  });

  it('returns topics for property_casualty category', () => {
    const topics = getTopicsByCategory('property_casualty');
    expect(topics.length).toBe(4);
    expect(topics[0].id).toBe('pc_property');
  });

  it('returns topics for life_insurance category', () => {
    const topics = getTopicsByCategory('life_insurance');
    expect(topics.length).toBe(4);
    expect(topics[0].id).toBe('li_policies');
  });

  it('returns topics for general_lines category', () => {
    const topics = getTopicsByCategory('general_lines');
    expect(topics.length).toBe(4);
    expect(topics[0].id).toBe('gl_commercial');
  });

  it('returns empty array for non-existent category', () => {
    const topics = getTopicsByCategory('nonexistent' as any);
    expect(topics).toEqual([]);
  });

  it('all returned topics have required fields', () => {
    const topics = getTopicsByCategory('real_estate');
    for (const topic of topics) {
      expect(topic.id).toBeDefined();
      expect(topic.nameEn).toBeDefined();
      expect(topic.nameEs).toBeDefined();
      expect(topic.descriptionEn).toBeDefined();
      expect(topic.descriptionEs).toBeDefined();
      expect(topic.questionCount).toBeGreaterThan(0);
    }
  });
});

describe('studyTopicsConfig', () => {
  it('has 4 categories', () => {
    expect(studyTopicsConfig.length).toBe(4);
  });

  it('every category has a category key, English name, Spanish name, and topics', () => {
    for (const cat of studyTopicsConfig) {
      expect(cat.category).toBeDefined();
      expect(cat.nameEn).toBeDefined();
      expect(cat.nameEs).toBeDefined();
      expect(cat.topics.length).toBeGreaterThan(0);
    }
  });

  it('all topic IDs are unique across categories', () => {
    const ids = new Set<string>();
    for (const cat of studyTopicsConfig) {
      for (const topic of cat.topics) {
        expect(ids.has(topic.id)).toBe(false);
        ids.add(topic.id);
      }
    }
  });

  it('total topic count across all categories is 17', () => {
    const total = studyTopicsConfig.reduce((acc, cat) => acc + cat.topics.length, 0);
    expect(total).toBe(17);
  });
});
