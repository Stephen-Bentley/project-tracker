import { useEffect, useState } from "react";
import axios from "axios";

interface User {
  _id: string;
  name: string;
  email: string;
}

interface Project {
  _id: string;
  name: string;
  members: User[];
}

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProjects();
    fetchUsers();
  }, []);

  const fetchProjects = async () => {
    const res = await axios.get("/api/projects");
    setProjects(res.data);
  };

  const fetchUsers = async () => {
    const res = await axios.get("/api/users");
    setUsers(res.data);
  };

  const selectProject = (project: Project) => {
    setSelectedProject(project);
    setSelectedMemberIds(project.members.map(m => m._id));
  };

  const toggleMember = (userId: string) => {
    setSelectedMemberIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const saveChanges = async () => {
    if (!selectedProject) return;

    setLoading(true);

    await axios.put(`/api/projects/${selectedProject._id}/members`, {
      members: selectedMemberIds
    });

    await fetchProjects();
    setLoading(false);
    alert("Project members updated");
  };

  return (
    <div style={{ display: "flex", gap: "40px" }}>
      {/* Left Side - Project List */}
      <div>
        <h2>All Projects</h2>
        {projects.map(project => (
          <div
            key={project._id}
            onClick={() => selectProject(project)}
            style={{
              padding: "8px",
              cursor: "pointer",
              background:
                selectedProject?._id === project._id ? "#eee" : "transparent"
            }}
          >
            {project.name}
          </div>
        ))}
      </div>

      {/* Right Side - Member Management */}
      {selectedProject && (
        <div>
          <h2>{selectedProject.name}</h2>
          <h3>Members</h3>

          {users.map(user => (
            <div key={user._id}>
              <label>
                <input
                  type="checkbox"
                  checked={selectedMemberIds.includes(user._id)}
                  onChange={() => toggleMember(user._id)}
                />
                {user.name} ({user.email})
              </label>
            </div>
          ))}

          <button onClick={saveChanges} disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}
    </div>
  );
}