import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  countPill?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, countPill, actions }: PageHeaderProps) {
  return (
    <div className="page-header">
      <div className="page-header-left">
        <div className="page-header-title-row">
          <h1 className="text-h1">{title}</h1>
          {countPill && <span className="count-pill">{countPill}</span>}
        </div>
        {description && <p className="page-header-desc">{description}</p>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </div>
  );
}
