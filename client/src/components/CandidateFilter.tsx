import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface FilterCriteria {
  skills: string[];
  skillsMatchMode: 'AND' | 'OR';
  position: string;
  minExperience: number;
  maxExperience: number;
}

interface CandidateFilterProps {
  onFilterChange: (criteria: FilterCriteria) => void;
  totalCount: number;
  filteredCount: number;
}

export function CandidateFilter({ onFilterChange, totalCount, filteredCount }: CandidateFilterProps) {
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [skillsMatchMode, setSkillsMatchMode] = useState<'AND' | 'OR'>('AND');
  const [position, setPosition] = useState('');
  const [minExp, setMinExp] = useState(0);
  const [maxExp, setMaxExp] = useState(30);

  const addSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      const newSkills = [...skills, skillInput.trim()];
      setSkills(newSkills);
      setSkillInput('');
      applyFilters({ ...getCriteria(), skills: newSkills });
    }
  };

  const removeSkill = (skill: string) => {
    const newSkills = skills.filter(s => s !== skill);
    setSkills(newSkills);
    applyFilters({ ...getCriteria(), skills: newSkills });
  };

  const getCriteria = (): FilterCriteria => ({
    skills,
    skillsMatchMode,
    position,
    minExperience: minExp,
    maxExperience: maxExp,
  });

  const applyFilters = (criteria?: FilterCriteria) => {
    onFilterChange(criteria || getCriteria());
  };

  const clearAll = () => {
    setSkills([]);
    setPosition('');
    setMinExp(0);
    setMaxExp(30);
    onFilterChange({
      skills: [],
      skillsMatchMode: 'AND',
      position: '',
      minExperience: 0,
      maxExperience: 30,
    });
  };

  return (
    <div className="bg-white rounded-lg border p-6 mb-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">🔍 Filter Candidates</h2>
        <div className="text-sm text-gray-600">
          📊 Showing <span className="font-bold">{filteredCount}</span> of {totalCount} candidates
        </div>
      </div>

      {/* Skills Filter */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Required Skills</Label>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={skillsMatchMode === 'AND' ? 'default' : 'outline'}
              onClick={() => {
                setSkillsMatchMode('AND');
                applyFilters({ ...getCriteria(), skillsMatchMode: 'AND' });
              }}
            >
              Match ALL
            </Button>
            <Button
              size="sm"
              variant={skillsMatchMode === 'OR' ? 'default' : 'outline'}
              onClick={() => {
                setSkillsMatchMode('OR');
                applyFilters({ ...getCriteria(), skillsMatchMode: 'OR' });
              }}
            >
              Match ANY
            </Button>
          </div>
        </div>

        {/* Skill Chips */}
        <div className="flex flex-wrap gap-2 mb-2">
          {skills.map((skill) => (
            <Badge key={skill} variant="secondary" className="px-3 py-1">
              {skill}
              <X
                className="ml-2 h-3 w-3 cursor-pointer"
                onClick={() => removeSkill(skill)}
              />
            </Badge>
          ))}
        </div>

        {/* Add Skill Input */}
        <div className="flex gap-2">
          <Input
            placeholder="Add skill (e.g., Java, React, Testing)"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addSkill()}
          />
          <Button onClick={addSkill}>+ Add</Button>
        </div>
      </div>

      {/* Position Filter */}
      <div className="space-y-2">
        <Label>Position/Role</Label>
        <Input
          placeholder="e.g., Test Engineer, Developer, QA"
          value={position}
          onChange={(e) => {
            setPosition(e.target.value);
            applyFilters({ ...getCriteria(), position: e.target.value });
          }}
        />
      </div>

      {/* Experience Range Filter */}
      <div className="space-y-2">
        <Label>Experience Range (years)</Label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-gray-500">Min Years</Label>
            <Input
              type="number"
              min="0"
              max="30"
              value={minExp}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 0;
                setMinExp(val);
                applyFilters({ ...getCriteria(), minExperience: val });
              }}
            />
          </div>
          <div>
            <Label className="text-xs text-gray-500">Max Years</Label>
            <Input
              type="number"
              min="0"
              max="30"
              value={maxExp}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 30;
                setMaxExp(val);
                applyFilters({ ...getCriteria(), maxExperience: val });
              }}
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button onClick={() => applyFilters()} className="flex-1">
          Apply Filters
        </Button>
        <Button onClick={clearAll} variant="outline">
          Clear All
        </Button>
      </div>
    </div>
  );
}