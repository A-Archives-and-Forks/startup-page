import { createContext, useContext, Component, type ReactNode } from "react";

const ClerkStatusContext = createContext(false);

export function useIsClerkAvailable() {
  return useContext(ClerkStatusContext);
}

export function ClerkUnavailableProvider({ children }: { children: ReactNode }) {
  return (
    <ClerkStatusContext.Provider value={false}>
      {children}
    </ClerkStatusContext.Provider>
  );
}

interface ClerkErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface ClerkErrorBoundaryState {
  hasError: boolean;
}

export class ClerkErrorBoundary extends Component<ClerkErrorBoundaryProps, ClerkErrorBoundaryState> {
  state: ClerkErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ClerkErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn("[startup-page] Clerk auth unavailable, running in local-only mode.", error.message);
  }

  render() {
    if (this.state.hasError) {
      return (
        <ClerkStatusContext.Provider value={false}>
          {this.props.fallback}
        </ClerkStatusContext.Provider>
      );
    }
    return (
      <ClerkStatusContext.Provider value={true}>
        {this.props.children}
      </ClerkStatusContext.Provider>
    );
  }
}
