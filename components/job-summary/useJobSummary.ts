import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { useOnline } from '../../lib/offline/connectivity';
import { useStore } from '../../lib/offline/store';
import { trackJob } from '../../lib/offline/sync';
import { fixtureTotals } from './summary';

// Reads the device copy, so the summary (and its PDF) works without signal.
export function useJobSummary() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const store = useStore();
  const online = useOnline();

  useFocusEffect(
    useCallback(() => {
      trackJob(jobId);
    }, [jobId])
  );

  const job = store.get('jobs', jobId) ?? null;
  const areas = store.where('areas', a => a.job_id === jobId)
    .map(area => ({ ...area, light_rows: store.where('light_rows', r => r.area_id === area.id) }));
  const totals = fixtureTotals(areas, store.all('light_types'));

  const loading = !store.loaded || (!job && online);
  const notOnDevice = store.loaded && !job && !online;
  const backHref = `/area-list?jobId=${jobId}`;

  return { jobId, job, totals, loading, notOnDevice, backHref };
}
