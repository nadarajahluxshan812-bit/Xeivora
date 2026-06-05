"use client";

import React from "react";
import type { ReactNode } from "react";

type MessageErrorBoundaryProps = {
  children: ReactNode;
};

type MessageErrorBoundaryState = {
  hasError: boolean;
};

export class MessageErrorBoundary extends React.Component<
  MessageErrorBoundaryProps,
  MessageErrorBoundaryState
> {
  state: MessageErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidUpdate(prevProps: MessageErrorBoundaryProps) {
    if (this.state.hasError && prevProps.children !== this.props.children) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-[16px] border border-[color:var(--site-border-strong)] bg-[color:var(--site-accent-soft)] px-4 py-3 text-sm text-[color:var(--site-text)]">
          Message could not be rendered
        </div>
      );
    }

    return this.props.children;
  }
}
