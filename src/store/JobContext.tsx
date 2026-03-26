"use client";

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';

export type JobStatus = 'Drafting' | 'Compliance' | 'Localization' | 'Pending' | 'Publishing' | 'Published';

export interface Job {
  id: string;
  topic: string;
  audience: string;
  languages: string[];
  status: JobStatus;
  progress: number;
  complianceIssues: number;
  createdAt: string;
  agentLogs?: { agent: string, message: string, time: string }[];
}

interface JobState {
  jobs: Job[];
  activeTab: string;
}

type JobAction = 
  | { type: 'SET_JOBS'; payload: Job[] }
  | { type: 'ADD_JOB'; payload: Job }
  | { type: 'UPDATE_JOB_STATUS'; payload: { id: string; status: JobStatus; progress: number } }
  | { type: 'SET_ACTIVE_TAB'; payload: string }
  | { type: 'ADD_LOG'; payload: { id: string; log: { agent: string, message: string, time: string } } };

const MOCK_JOBS: Job[] = [
  { id: 'JOB-001', topic: 'Q3 Financials', audience: 'Investors', languages: ['EN', 'DE'], status: 'Drafting', progress: 40, complianceIssues: 0, createdAt: new Date(Date.now() - 3600000 * 2).toISOString(), agentLogs: [{ agent: 'DraftAgent', message: 'Generating financial summary text', time: new Date().toISOString()}] },
  { id: 'JOB-002', topic: 'Health Privacy Update', audience: 'Patients', languages: ['EN', 'ES', 'FR'], status: 'Compliance', progress: 55, complianceIssues: 2, createdAt: new Date(Date.now() - 3600000 * 5).toISOString() },
  { id: 'JOB-003', topic: 'Product Launch X', audience: 'Public', languages: ['EN', 'JP'], status: 'Pending', progress: 80, complianceIssues: 0, createdAt: new Date(Date.now() - 3600000 * 12).toISOString() },
  { id: 'JOB-004', topic: 'Internal Newsletter', audience: 'Employees', languages: ['EN'], status: 'Localization', progress: 70, complianceIssues: 0, createdAt: new Date(Date.now() - 3600000 * 1).toISOString() },
];

const initialState: JobState = {
  jobs: [],
  activeTab: 'PIPELINE',
};

const JobContext = createContext<{ state: JobState; dispatch: React.Dispatch<JobAction> } | undefined>(undefined);

const jobReducer = (state: JobState, action: JobAction): JobState => {
  switch (action.type) {
    case 'SET_JOBS':
      return { ...state, jobs: action.payload };
    case 'ADD_JOB':
      return { ...state, jobs: [action.payload, ...state.jobs] };
    case 'UPDATE_JOB_STATUS':
      return {
        ...state,
        jobs: state.jobs.map(job => 
          job.id === action.payload.id 
            ? { ...job, status: action.payload.status, progress: action.payload.progress }
            : job
        ),
      };
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.payload };
    case 'ADD_LOG':
      return {
        ...state,
        jobs: state.jobs.map(job =>
          job.id === action.payload.id
            ? { ...job, agentLogs: [...(job.agentLogs || []), action.payload.log] }
            : job
        ),
      }
    default:
      return state;
  }
};

export const JobProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(jobReducer, initialState);

  useEffect(() => {
    // Simulate initial fetch
    dispatch({ type: 'SET_JOBS', payload: MOCK_JOBS });

    // Poll to simulate real-time updates and logs arriving
    const interval = setInterval(() => {
      // Simulate live agent terminal logs
      const randomJob = state.jobs[Math.floor(Math.random() * state.jobs.length)] || MOCK_JOBS[0];
      if (randomJob) {
        dispatch({ 
          type: 'ADD_LOG', 
          payload: { 
            id: randomJob.id, 
            log: { agent: 'System', message: 'Checking compliance sub-routines...', time: new Date().toISOString() }
          }
        });
      }
    }, 10000);

    return () => clearInterval(interval);
  }, []); // Only runs on mount

  return (
    <JobContext.Provider value={{ state, dispatch }}>
      {children}
    </JobContext.Provider>
  );
};

export const useJobContext = () => {
  const context = useContext(JobContext);
  if (!context) throw new Error('useJobContext must be used within JobProvider');
  return context;
};
