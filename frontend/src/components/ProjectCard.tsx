import React from 'react';
import { Project } from '../types/projects';

interface Props {
  project: Project;
  onClick: () => void;
}

const ProjectCard: React.FC<Props> = ({ project, onClick }) => {
  return (
    <div className="project-card" onClick={onClick}>
      <h3>{project.name}</h3>
      {project.description && <p>{project.description}</p>}
      <small>{project.members.length} members</small>
    </div>
  );
};

export default ProjectCard;
