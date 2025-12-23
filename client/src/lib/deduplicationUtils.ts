import type { Candidate } from "@shared/schema";

// ✅ Levenshtein distance for name similarity
export function levenshteinDistance(str1: string, str2: string): number {
  const track = Array(str2.length + 1)
    .fill(null)
    .map(() => Array(str1.length + 1).fill(0));

  for (let i = 0; i <= str1.length; i++) track[0][i] = i;
  for (let j = 0; j <= str2.length; j++) track[j][0] = j;

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator
      );
    }
  }

  return track[str2.length][str1.length];
}

export interface DuplicateGroup {
  duplicates: Candidate[];
  reason: "email" | "phone" | "name_similarity";
  similarity: number;
}

export function findDuplicates(
  candidates: Candidate[],
  nameSimilarityThreshold = 2
): DuplicateGroup[] {
  const duplicates: DuplicateGroup[] = [];
  const seen = new Set<string>();

  // Email duplicates
  const emailMap = new Map<string, Candidate[]>();
  candidates.forEach((c) => {
    c.emails?.forEach((email) => {
      const key = email.toLowerCase();
      if (!emailMap.has(key)) emailMap.set(key, []);
      emailMap.get(key)!.push(c);
    });
  });

  emailMap.forEach((group) => {
    if (group.length > 1) {
      const ids = group.map((c) => c.id).sort().join("|");
      if (!seen.has(ids)) {
        duplicates.push({
          duplicates: group,
          reason: "email",
          similarity: 100,
        });
        seen.add(ids);
      }
    }
  });

  // Phone duplicates
  const phoneMap = new Map<string, Candidate[]>();
  candidates.forEach((c) => {
    c.phones?.forEach((phone) => {
      const key = phone.replace(/\D/g, "");
      if (key.length > 0) {
        if (!phoneMap.has(key)) phoneMap.set(key, []);
        phoneMap.get(key)!.push(c);
      }
    });
  });

  phoneMap.forEach((group) => {
    if (group.length > 1) {
      const ids = group.map((c) => c.id).sort().join("|");
      if (!seen.has(ids)) {
        duplicates.push({
          duplicates: group,
          reason: "phone",
          similarity: 100,
        });
        seen.add(ids);
      }
    }
  });

  // Name similarity
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const name1 = candidates[i].fullName?.toLowerCase() || "";
      const name2 = candidates[j].fullName?.toLowerCase() || "";

      if (name1 && name2) {
        const distance = levenshteinDistance(name1, name2);
        if (distance <= nameSimilarityThreshold) {
          const similarity = Math.max(
            0,
            100 - (distance / Math.max(name1.length, name2.length)) * 100
          );
          const ids = [candidates[i].id, candidates[j].id].sort().join("|");

          if (!seen.has(ids)) {
            duplicates.push({
              duplicates: [candidates[i], candidates[j]],
              reason: "name_similarity",
              similarity,
            });
            seen.add(ids);
          }
        }
      }
    }
  }

  return duplicates;
}

export function calculateSkillFrequency(
  candidates: Candidate[]
): Map<string, number> {
  const skillMap = new Map<string, number>();
  candidates.forEach((c) => {
    c.skills?.forEach((skill) => {
      skillMap.set(skill, (skillMap.get(skill) || 0) + 1);
    });
  });
  return skillMap;
}

export function calculateExperienceDistribution(candidates: Candidate[]) {
  const distribution = {
    junior: 0,
    mid: 0,
    senior: 0,
    expert: 0,
  };

  candidates.forEach((c) => {
    const totalExp = c.experience?.length || 0;
    if (totalExp < 2) distribution.junior++;
    else if (totalExp < 5) distribution.mid++;
    else if (totalExp < 10) distribution.senior++;
    else distribution.expert++;
  });

  return distribution;
}
