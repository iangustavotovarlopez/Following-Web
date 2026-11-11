import { useCallback, useEffect, useState } from 'react';
import { API_MUTATION_EVENT, type ApiMutationDetail } from '../../../shared/api';
import { projectsApi, type Planning } from '../infrastructure/api';

export function useProjectPlanning(projectId?: number) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{
    projectId?: number;
    plannings: Planning[];
    loading: boolean;
    error: string | null;
  }>({ projectId, plannings: [], loading: Boolean(projectId), error: null });
  const refresh = useCallback(() => setRevision((current) => current + 1), []);

  useEffect(() => {
    let active = true;
    setState({ projectId, plannings: [], loading: Boolean(projectId), error: null });
    if (projectId) {
      void projectsApi.listPlanning(projectId).then((response) => {
        if (active) setState({ projectId, plannings: response ?? [], loading: false, error: null });
      }).catch((cause) => {
        if (active) setState({
          projectId, plannings: [], loading: false,
          error: cause instanceof Error ? cause.message : 'No se pudieron consultar las planeaciones.',
        });
      });
    }
    return () => { active = false; };
  }, [projectId, revision]);

  useEffect(() => {
    if (!projectId) return;
    const pathPrefix = `/projects/v0/projects/${projectId}/plannings`;
    function handleMutation(event: Event) {
      const { path } = (event as CustomEvent<ApiMutationDetail>).detail;
      if (path === pathPrefix || path.startsWith(`${pathPrefix}/`)) refresh();
    }
    window.addEventListener(API_MUTATION_EVENT, handleMutation);
    return () => window.removeEventListener(API_MUTATION_EVENT, handleMutation);
  }, [projectId, refresh]);

  return {
    plannings: state.projectId === projectId ? state.plannings : [],
    loading: state.projectId === projectId ? state.loading : Boolean(projectId),
    error: state.projectId === projectId ? state.error : null,
    refresh,
  };
}
