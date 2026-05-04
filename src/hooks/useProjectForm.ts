import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { Project, ProjectStatus } from '@/types/index';

export interface ProjectFormPayloadCreate {
  name: string;
  clientId: string;
  description: string;
  status: ProjectStatus;
  ownerId: string | undefined;
  startDate: string | undefined;
  endDate: string | undefined;
}

export interface ProjectFormPayloadUpdate {
  name: string;
  description: string;
  status: ProjectStatus;
  ownerId: string | undefined;
  startDate: string | undefined;
  endDate: string | undefined;
}

export function useProjectForm() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [clientName, setClientName] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('active');
  const [ownerId, setOwnerId] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const reset = useCallback(() => {
    setName('');
    setDescription('');
    setClientName('');
    setStatus('active');
    setOwnerId('');
    setStartDate(undefined);
    setEndDate(undefined);
  }, []);

  const loadFromProject = useCallback((project: Project) => {
    setName(project.name);
    setDescription(project.description ?? '');
    setClientName(project.clientId ?? '');
    setStatus(project.status);
    setOwnerId(project.ownerId ?? '');
    setStartDate(project.startDate ? new Date(project.startDate) : undefined);
    setEndDate(project.endDate ? new Date(project.endDate) : undefined);
  }, []);

  const toCreatePayload = useCallback((): ProjectFormPayloadCreate => ({
    name: name.trim(),
    clientId: clientName,
    description,
    status,
    ownerId: ownerId || undefined,
    startDate: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
    endDate: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
  }), [name, clientName, description, status, ownerId, startDate, endDate]);

  const toUpdatePayload = useCallback((): ProjectFormPayloadUpdate => ({
    name: name.trim(),
    description,
    status,
    ownerId: ownerId || undefined,
    startDate: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
    endDate: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
  }), [name, description, status, ownerId, startDate, endDate]);

  return {
    name, setName,
    description, setDescription,
    clientName, setClientName,
    status, setStatus,
    ownerId, setOwnerId,
    startDate, setStartDate,
    endDate, setEndDate,
    reset,
    loadFromProject,
    toCreatePayload,
    toUpdatePayload,
    isValid: name.trim().length > 0,
  };
}
