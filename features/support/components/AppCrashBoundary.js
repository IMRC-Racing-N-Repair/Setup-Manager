import React from 'react';
import CrashReportScreen from './CrashReportScreen';
import { makeCrashReport, saveCrashReport } from '../crashReporting';

export default class AppCrashBoundary extends React.Component {
  state = { error: null, report: null, retryKey: 0 };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    const report = makeCrashReport(error, {
      fatal: true,
      source: 'react-error-boundary',
      componentStack: info?.componentStack || '',
    });
    this.setState({ report });
    saveCrashReport(report).catch(() => null);
  }

  retry = () => {
    this.setState((state) => ({ error: null, report: null, retryKey: state.retryKey + 1 }));
  };

  render() {
    if (this.state.error) {
      return <CrashReportScreen error={this.state.error} report={this.state.report} onRetry={this.retry} />;
    }
    return <React.Fragment key={this.state.retryKey}>{this.props.children}</React.Fragment>;
  }
}

