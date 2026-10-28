import { Link } from 'react-router-dom';
import { Compass, Home } from 'lucide-react';
import { Button, EmptyState } from '../components/ui.jsx';

export default function NotFound() {
  return (
    <EmptyState
      icon={Compass}
      title="This page has wandered off"
      description="The link may be outdated, or the page may have moved. Head back to your dashboard and keep your momentum."
      className="mt-10 min-h-[50vh] bg-surface"
      action={
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Link to="/dashboard">
            <Button>
              <Home size={16} /> Back to dashboard
            </Button>
          </Link>
          <Link to="/courses">
            <Button variant="secondary">Browse courses</Button>
          </Link>
        </div>
      }
    />
  );
}
