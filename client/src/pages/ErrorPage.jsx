import { Link, useLocation } from 'react-router-dom';
import { AlertTriangle, Home, RotateCcw } from 'lucide-react';
import { Button, Card } from '../components/ui.jsx';

export default function ErrorPage() {
  const location = useLocation();
  const message = location.state?.message || 'An unexpected error interrupted the page.';
  return (
    <div className="mx-auto max-w-xl py-12">
      <Card className="p-8 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-danger/10 text-danger">
          <AlertTriangle size={26} />
        </span>
        <h1 className="mt-5 font-display text-2xl font-semibold text-main">That did not go as planned</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">{message}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Button onClick={() => window.location.reload()}>
            <RotateCcw size={16} /> Reload page
          </Button>
          <Link to="/dashboard">
            <Button variant="secondary">
              <Home size={16} /> Dashboard
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
