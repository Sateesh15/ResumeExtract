export interface FilterCriteria {
  skills?: string[];           // ["Java", "Spring Boot"]
  skillsMatchMode?: 'AND' | 'OR';  // Match ALL or ANY
  position?: string;           // "Test Engineer"
  minExperience?: number;      // 2 (years)
  maxExperience?: number;      // 5 (years)
}

export interface Candidate {
  id: string;
  fullName: string | null ;
  skills: string[];
  experience: any[];
  summary: string | null ;
  rawText?: string;
  confidence?: any;
  // ... other fields
}

/**
 * Parse experience string to years (float)
 * "3 years 6 months" → 3.5
 * "Fresher" → 0
 */
export function parseExperienceToYears(exp: string): number {
  if (!exp || exp.toLowerCase() === 'fresher' || exp.toLowerCase() === 'n/a') {
    return 0;
  }

  // Extract years and months
  const yearMatch = exp.match(/(\d+)\s*years?/i);
  const monthMatch = exp.match(/(\d+)\s*months?/i);

  const years = yearMatch ? parseInt(yearMatch[1]) : 0;
  const months = monthMatch ? parseInt(monthMatch[1]) : 0;

  return years + (months / 12);
}

/**
 * Check if candidate skill matches required skill (fuzzy)
 */
export function skillMatches(candidateSkill: string, requiredSkill: string): boolean {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  const candidate = normalize(candidateSkill);
  const required = normalize(requiredSkill);

  // Exact match
  if (candidate === required) return true;

  // Contains match
  if (candidate.includes(required) || required.includes(candidate)) return true;

  // Common variations
  const variations: Record<string, string[]> = {
    'javascript': ['js', 'javascript', 'ecmascript'],
    'typescript': ['ts', 'typescript'],
    'react': ['react', 'reactjs', 'react.js'],
    'vue': ['vue', 'vuejs', 'vue.js'],
    'angular': ['angular', 'angularjs'],
    'java': ['java', 'corejava', 'advancedjava'],
    'python': ['python', 'py'],
    'testing': ['testing', 'test', 'qa', 'qualityassurance'],
  };

  for (const [key, vars] of Object.entries(variations)) {
    if (vars.includes(required) && vars.includes(candidate)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if position matches (fuzzy)
 */
export function positionMatches(candidatePosition: string, requiredPosition: string): boolean {
  if (!candidatePosition || !requiredPosition) return false;

  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  
  const candidate = normalize(candidatePosition);
  const required = normalize(requiredPosition);

  // Contains match
  if (candidate.includes(required) || required.includes(candidate)) return true;

  // Synonyms
  const synonyms: Record<string, string[]> = {
    'developer': ['developer', 'engineer', 'programmer', 'coder'],
    'tester': ['tester', 'qa', 'test engineer', 'quality analyst', 'test consultant'],
    'frontend': ['frontend', 'front-end', 'ui developer', 'client-side'],
    'backend': ['backend', 'back-end', 'server-side'],
    'fullstack': ['fullstack', 'full-stack', 'full stack'],
  };

  for (const [key, syns] of Object.entries(synonyms)) {
    const reqMatch = syns.some(s => required.includes(s));
    const candMatch = syns.some(s => candidate.includes(s));
    if (reqMatch && candMatch) return true;
  }

  return false;
}

/**
 * Filter candidates based on criteria
 */
export function filterCandidates(
  candidates: Candidate[],
  criteria: FilterCriteria,
  calculateTotalExp: (candidate: any) => string
): Candidate[] {
  return candidates.filter(candidate => {
    // Filter by skills
    if (criteria.skills && criteria.skills.length > 0) {
      const candidateSkills = candidate.skills || [];
      const matchMode = criteria.skillsMatchMode || 'AND';

      if (matchMode === 'AND') {
        // ALL required skills must match
        const allMatch = criteria.skills.every(requiredSkill =>
          candidateSkills.some(candidateSkill =>
            skillMatches(candidateSkill, requiredSkill)
          )
        );
        if (!allMatch) return false;
      } else {
        // ANY required skill must match
        const anyMatch = criteria.skills.some(requiredSkill =>
          candidateSkills.some(candidateSkill =>
            skillMatches(candidateSkill, requiredSkill)
          )
        );
        if (!anyMatch) return false;
      }
    }

    // Filter by position
    if (criteria.position) {
      const currentPosition = candidate.experience?.[0]?.title || '';
      if (!positionMatches(currentPosition, criteria.position)) {
        return false;
      }
    }

    // Filter by experience range
    if (criteria.minExperience !== undefined || criteria.maxExperience !== undefined) {
      const expString = calculateTotalExp(candidate);
      const expYears = parseExperienceToYears(expString);

      if (criteria.minExperience !== undefined && expYears < criteria.minExperience) {
        return false;
      }

      if (criteria.maxExperience !== undefined && expYears > criteria.maxExperience) {
        return false;
      }
    }

    return true;
  });
}
