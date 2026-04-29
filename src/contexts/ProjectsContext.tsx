import React, { createContext, useContext, Component, type ReactNode } from 'react';
import { useProjects } from '@/hooks/useProjects';

type ProjectsContextType = ReturnType<typeof useProjects>;

const ProjectsContext = createContext<ProjectsContextType | null>(null);

// Error boundary to prevent ProjectsProvider crashes from killing the whole app
class ProjectsErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error) { console.error('ProjectsProvider error:', error); }
  render() {
    if (this.state.hasError) return this.props.children;
    return this.props.children;
  }
}

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const projects = useProjects();
  return (
    <ProjectsErrorBoundary>
      <ProjectsContext.Provider value={projects}>{children}</ProjectsContext.Provider>
    </ProjectsErrorBoundary>
  );
}

export function useProjectsContext() {
  const ctx = useContext(ProjectsContext);
  if (!ctx) throw new Error('useProjectsContext must be used within ProjectsProvider');
  return ctx;
}
