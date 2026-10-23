import { useCallback, useEffect, useState } from "react";

interface ServiceState<T> {
  data?: T;
  error?: Error;
  loading: boolean;
}

export function useServiceData<T>(loader: () => Promise<T>, deps: readonly unknown[] = []) {
  const [state, setState] = useState<ServiceState<T>>({ loading: true });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setState((previous) => ({ data: previous.data, loading: true }));
    loader().then(
      (data) => {
        if (active) setState({ data, loading: false });
      },
      (error: unknown) => {
        if (active) {
          setState({
            loading: false,
            error: error instanceof Error ? error : new Error("Something went wrong."),
          });
        }
      },
    );
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, ...deps]);

  const retry = useCallback(() => setAttempt((count) => count + 1), []);

  return { data: state.data, error: state.error, loading: state.loading, retry };
}
