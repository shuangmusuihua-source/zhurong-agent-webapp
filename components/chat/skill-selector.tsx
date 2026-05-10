"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

const AVAILABLE_SKILLS = [
  {
    id: "frontend-slides",
    name: "Frontend Slides",
    description: "前端技术幻灯片生成",
  },
  {
    id: "guizang-ppt-skill",
    name: "Guizang PPT",
    description: "电子杂志风格横向翻页网页 PPT",
  },
  {
    id: "kami-html-slides",
    name: "Kami Slides",
    description: "交互式 HTML 幻灯片生成",
  },
];

interface SkillSelectorProps {
  selectedSkills: string[];
  onSkillsChange: (skills: string[]) => void;
}

export function SkillSelector({ selectedSkills, onSkillsChange }: SkillSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSkill = (skillId: string) => {
    if (selectedSkills.includes(skillId)) {
      onSkillsChange(selectedSkills.filter((id) => id !== skillId));
    } else {
      onSkillsChange([...selectedSkills, skillId]);
    }
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="gap-2"
      >
        Skills
        {selectedSkills.length > 0 && (
          <span className="bg-primary text-primary-foreground rounded-full px-2 text-xs">
            {selectedSkills.length}
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-background border rounded-lg shadow-lg z-10">
          <div className="p-2">
            <p className="text-sm font-medium mb-2">Select Skills</p>
            <div className="space-y-1">
              {AVAILABLE_SKILLS.map((skill) => (
                <label
                  key={skill.id}
                  className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedSkills.includes(skill.id)}
                    onChange={() => toggleSkill(skill.id)}
                    className="rounded"
                  />
                  <div>
                    <p className="text-sm font-medium">{skill.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {skill.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
