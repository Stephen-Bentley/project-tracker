import React, { useEffect, useState } from 'react';
import { getMyProjects } from '../api/projects';
import { Project } from '../types/projects';
import ProjectCard from '../components/ProjectCard';
import { useNavigate } from 'react-router-dom';

const Projects: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const data = await getMyProjects();
        setProjects(data);
      } catch (err) {
        console.error(err);
        alert('Failed to load projects');
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, []);

  if (loading) return <p style={{ padding: 24 }}>Loading projects...</p>;

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ color: '#16a34a' }}>My Projects</h1>

      {projects.length === 0 && <p>No projects yet.</p>}

      <div style={styles.grid}>
        {projects.map(project => (
          <ProjectCard
            key={project._id}
            project={project}
            onClick={() => navigate(`/projects/${project._id}`)}
          />
        ))}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  grid: {
    marginTop: 20,
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: 20
  }
};

export default Projects;
