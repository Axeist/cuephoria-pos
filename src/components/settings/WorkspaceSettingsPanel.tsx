import React from "react";
import { Link } from "react-router-dom";
import { Building2, ExternalLink, Palette, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Entry point for workspace-level settings (identity, branding, subscription).
 * Full editor lives on /settings/organization to avoid duplicating large forms here.
 */
const WorkspaceSettingsPanel: React.FC = () => (
  <div className="space-y-4 max-w-2xl">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Building2 className="h-5 w-5" />
          Workspace
        </CardTitle>
        <CardDescription>
          Name, legal details, branding, and subscription — shared across all branches.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="text-sm text-muted-foreground space-y-2">
          <li className="flex items-start gap-2">
            <Palette className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
            Logo, colors, and display name for login and public booking
          </li>
          <li className="flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
            Plan, trial, and billing
          </li>
        </ul>
        <Button asChild className="gap-2">
          <Link to="/settings/organization">
            Open workspace settings
            <ExternalLink className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
    <p className="text-xs text-muted-foreground">
      Manage physical locations under the <strong>Branches</strong> tab in Settings.
    </p>
  </div>
);

export default WorkspaceSettingsPanel;
