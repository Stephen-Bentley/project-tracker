import React from 'react';
import { Project } from '../types/projects';

interface Props {
  project: Project;
  onClick: () => void;
}

const ProjectCard: React.FC<Props> = ({ project, onClick }) => {
  return (
    <div style={styles.card} onClick={onClick}>
      <h3 style={styles.title}>{project.name}</h3>
      {project.description && (
        <p style={styles.description}>{project.description}</p>
      )}
      <small>{project.members.length} members</small>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: '#fff',
    padding: 20,
    borderRadius: 8,
    cursor: 'pointer',
    boxShadow: '0 6px 15px rgba(0,0,0,0.08)',
    borderLeft: '6px solid #22c55e'
  },
  title: {
    margin: '0 0 8px 0',
    color: '#16a34a'
  },
  description: {
    marginBottom: 10,
    color: '#555'
  }
};

export default ProjectCard;
