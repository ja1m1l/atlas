"use client";

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

export type JobStatus = 'Drafting' | 'Compliance' | 'Localization' | 'Pending' | 'Publishing' | 'Published';

export interface Job {
  id: string;
  display_id?: string;
  topic: string;
  audience: string;
  languages: string[];
  status: JobStatus;
  progress: number;
  complianceIssues: number;
  createdAt: string;
  outputContent?: Record<string, string>;
  imageUrl?: string;
  publishedChannels?: string[];
  agentLogs?: { agent: string, message: string, time: string }[];
}

interface JobState {
  jobs: Job[];
  activeTab: string;
  loading: boolean;
}

type JobAction = 
  | { type: 'SET_JOBS'; payload: Job[] }
  | { type: 'UPSERT_JOB'; payload: Job }
  | { type: 'SET_ACTIVE_TAB'; payload: string }
  | { type: 'ADD_LOG'; payload: { id: string; log: { agent: string, message: string, time: string } } }
  | { type: 'SET_LOADING'; payload: boolean };

const initialState: JobState = {
  jobs: [],
  activeTab: 'PIPELINE',
  loading: true,
};

const JobContext = createContext<{ state: JobState; dispatch: React.Dispatch<JobAction> } | undefined>(undefined);

const jobReducer = (state: JobState, action: JobAction): JobState => {
  switch (action.type) {
    case 'SET_JOBS':
      return { ...state, jobs: action.payload, loading: false };
    case 'UPSERT_JOB': {
      const exists = state.jobs.find(j => j.id === action.payload.id);
      if (exists) {
        return {
          ...state,
          jobs: state.jobs.map(j => j.id === action.payload.id ? { ...j, ...action.payload } : j)
        };
      }
      return { ...state, jobs: [action.payload, ...state.jobs] };
    }
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.payload };
    case 'ADD_LOG':
      return {
        ...state,
        jobs: state.jobs.map(job =>
          job.id === action.payload.id
            ? { 
                ...job, 
                agentLogs: [...(job.agentLogs || []).filter(l => l.time !== action.payload.log.time || l.message !== action.payload.log.message), action.payload.log]
                  .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
              }
            : job
        ),
      };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    default:
      return state;
  }
};

export const JobProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(jobReducer, initialState);

  useEffect(() => {
    const fetchInitialData = async () => {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // 1. Fetch Jobs
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false });

      if (jobsError) {
        console.error('Error fetching jobs:', jobsError);
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }

      // 2. Fetch Logs for these jobs
      const { data: logsData, error: logsError } = await supabase
        .from('agent_logs')
        .select('*')
        .order('created_at', { ascending: true });

      const jobsWithLogs: Job[] = (jobsData || []).map(j => ({
        id: j.id,
        display_id: j.display_id,
        topic: j.topic,
        audience: j.audience,
        languages: j.languages,
        status: j.status as JobStatus,
        progress: j.progress,
        complianceIssues: j.compliance_issues,
        createdAt: j.created_at,
        outputContent: j.output_content,
        imageUrl: j.image_url,
        publishedChannels: j.published_channels,
        agentLogs: (logsData || [])
          .filter(l => l.job_id === j.id)
          .map(l => ({ agent: l.agent_name, message: l.message, time: l.created_at }))
      }));

      dispatch({ type: 'SET_JOBS', payload: jobsWithLogs });
    };

    fetchInitialData();

    // 3. Real-time Subscriptions
    const jobsSubscription = supabase
      .channel('public:jobs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, payload => {
        const newJob = payload.new as any;
        if (newJob) {
          dispatch({
            type: 'UPSERT_JOB',
            payload: {
              id: newJob.id,
              display_id: newJob.display_id,
              topic: newJob.topic,
              audience: newJob.audience,
              languages: newJob.languages,
              status: newJob.status as JobStatus,
              progress: newJob.progress,
              complianceIssues: newJob.compliance_issues,
              createdAt: newJob.created_at,
              outputContent: newJob.output_content,
              imageUrl: newJob.image_url,
              publishedChannels: newJob.published_channels,
            }
          });
        }
      })
      .subscribe();

    const logsSubscription = supabase
      .channel('public:agent_logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'agent_logs' }, payload => {
        const newLog = payload.new as any;
        if (newLog) {
          dispatch({
            type: 'ADD_LOG',
            payload: {
              id: newLog.job_id,
              log: { agent: newLog.agent_name, message: newLog.message, time: newLog.created_at }
            }
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(jobsSubscription);
      supabase.removeChannel(logsSubscription);
    };
  }, []);

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
