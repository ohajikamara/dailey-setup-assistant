import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Cloud,
  Code2,
  Cpu,
  FileText,
  GitBranch,
  Home,
  Laptop,
  Link,
  ListChecks,
  Loader2,
  MonitorCheck,
  Moon,
  RefreshCw,
  Settings,
  ShieldCheck,
  Sun,
  Terminal,
  Unplug,
  Wrench,
  X
} from "lucide-react";
import "./styles.css";
import daileyLogo from "./assets/dailey-logo.png";
import introHero from "./assets/dailey-intro-hero.png";

const api = window.daileyAssistant;

const clientCards = [
  {
    id: "codex",
    name: "Codex",
    shortName: "Codex",
    accent: "blue",
    icon: <Code2 aria-hidden="true" />,
    installUrl: "https://developers.openai.com/codex/app",
    description: "Lets Codex see and use your Dailey projects."
  },
  {
    id: "claude",
    name: "Claude Desktop",
    shortName: "Claude",
    accent: "orange",
    icon: <Laptop aria-hidden="true" />,
    installUrl: "https://claude.com/download",
    description: "Lets Claude Desktop use the Dailey connector."
  },
  {
    id: "opencode",
    name: "OpenCode",
    shortName: "OpenCode",
    accent: "purple",
    icon: <Terminal aria-hidden="true" />,
    installUrl: "https://opencode.ai/download",
    description: "Lets OpenCode use the Dailey connector."
  }
];

const setupStepLabels = [
  "Sign in to Dailey",
  "Sign in to GitHub",
  "Choose your AI platform",
  "Reload your AI app",
  "Finish setup"
];

function LogoMark({ size = "normal" }) {
  return (
    <div className={`logo-mark ${size}`} aria-hidden="true">
      <img src={daileyLogo} alt="" />
    </div>
  );
}

function IconButton({ icon, label, onClick }) {
  return (
    <button className="icon-button" aria-label={label} title={label} onClick={onClick}>
      {icon}
    </button>
  );
}

function Button({ children, icon, variant = "secondary", busy, ...props }) {
  return (
    <button className={`button ${variant}`} disabled={busy || props.disabled} {...props}>
      {busy ? <Loader2 className="spin" aria-hidden="true" /> : icon}
      <span>{children}</span>
    </button>
  );
}

function StatusPill({ ready }) {
  return (
    <span className={`status-pill ${ready ? "ready" : "working"}`}>
      <span />
      {ready ? "System ready" : "Setup in progress"}
    </span>
  );
}

function TopBar({ ready, loading, onRefresh, onToggleTheme, onOpenHelp, onOpenSettings, theme }) {
  return (
    <header className="topbar">
      <div className="traffic-lights" aria-hidden="true">
        <span className="red" />
        <span className="yellow" />
        <span className="green" />
      </div>
      <div className="top-title">
        <LogoMark size="tiny" />
        <strong>Dailey Setup Assistant</strong>
      </div>
      <div className="top-controls">
        <StatusPill ready={ready} />
        <IconButton icon={loading ? <Loader2 className="spin" /> : <RefreshCw />} label="Refresh" onClick={onRefresh} />
        <IconButton icon={theme === "dark" ? <Sun /> : <Moon />} label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} onClick={onToggleTheme} />
        <IconButton icon={<CircleHelp />} label="Help" onClick={onOpenHelp} />
        <IconButton icon={<Settings />} label="Settings" onClick={onOpenSettings} />
      </div>
    </header>
  );
}

function SetupTopBar({ onToggleTheme, onOpenHelp, onOpenSettings, theme }) {
  return (
    <header className="topbar setup-topbar">
      <div className="traffic-lights" aria-hidden="true">
        <span className="red" />
        <span className="yellow" />
        <span className="green" />
      </div>
      <div className="top-title">
        <LogoMark size="tiny" />
        <strong>Dailey Setup Assistant</strong>
      </div>
      <div className="top-controls">
        <IconButton icon={theme === "dark" ? <Sun /> : <Moon />} label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} onClick={onToggleTheme} />
        <IconButton icon={<CircleHelp />} label="Help" onClick={onOpenHelp} />
        <IconButton icon={<Settings />} label="Settings" onClick={onOpenSettings} />
      </div>
    </header>
  );
}

function Sidebar({ diagnostics, loading, onOpenSettings, stages = [], activeStage, setupComplete }) {
  const daileyConnected = Boolean(diagnostics?.accounts?.dailey?.connected);
  const accountTitle = loading
    ? "Checking"
    : daileyConnected
    ? "Dailey connected"
    : "Dailey not connected";
  const accountDetail = loading
    ? "Verifying account..."
    : daileyConnected
    ? diagnostics.accounts.dailey.detail
    : "Sign in to show the real account";
  const accountIcon = loading
    ? <Loader2 className="spin" aria-hidden="true" />
    : daileyConnected
    ? <ShieldCheck aria-hidden="true" />
    : <Unplug aria-hidden="true" />;
  const dashboardNavItems = [
    { label: "Dashboard", icon: <Home aria-hidden="true" />, active: true, href: "#overview" },
    { label: "Connections", icon: <Link aria-hidden="true" />, href: "#ai-apps" },
    { label: "Diagnostics", icon: <ShieldCheck aria-hidden="true" />, href: "#diagnostics" },
    { label: "Logs", icon: <FileText aria-hidden="true" />, href: "#logs" },
    { label: "Settings", icon: <Settings aria-hidden="true" />, onClick: onOpenSettings }
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <LogoMark />
        <span>dailey.cloud</span>
      </div>

      {setupComplete ? (
        <nav className="sidebar-nav" aria-label="Dashboard navigation">
          {dashboardNavItems.map((item) => (
            <a
              className={item.active ? "active" : ""}
              href={item.href || "#"}
              key={item.label}
              onClick={(event) => {
                if (item.onClick) {
                  event.preventDefault();
                  item.onClick();
                }
              }}
            >
              {item.icon}
              {item.label}
            </a>
          ))}
        </nav>
      ) : (
        <div className="sidebar-setup" aria-label="Setup steps">
          <div className="sidebar-setup-heading">
            <ListChecks aria-hidden="true" />
            <span>Setup path</span>
          </div>
          {(stages.length > 0 ? stages : setupStepLabels.map((title, index) => ({
            id: title,
            number: index + 1,
            title,
            complete: false,
            state: activeStage?.number === index + 1 ? "active" : "waiting"
          }))).map((stage) => (
            <div className={`sidebar-step ${stage.state}`} key={stage.id}>
              <span>{stage.complete ? <CheckCircle2 aria-hidden="true" /> : stage.number}</span>
              <strong>{stage.title}</strong>
            </div>
          ))}
        </div>
      )}

      <div className={`sidebar-user ${daileyConnected ? "connected" : "not-connected"}`} aria-label={accountTitle}>
        <div className="avatar">{accountIcon}</div>
        <div>
          <strong>{accountTitle}</strong>
          <span>{accountDetail}</span>
        </div>
        <ChevronRight aria-hidden="true" />
      </div>
    </aside>
  );
}

function HeroPanel() {
  return (
    <section className="hero" id="overview">
      <div className="hero-copy">
        <h1>
          Connect Dailey
          <span>in five guided steps</span>
        </h1>
        <p>A calm, one-step-at-a-time setup for Dailey, GitHub, and your AI app.</p>
      </div>
      <div className="hero-art" aria-hidden="true">
        <img src={introHero} alt="" />
      </div>
    </section>
  );
}

function StepTracker({ stages }) {
  const visibleStages = stages.length > 0
    ? stages
    : setupStepLabels.map((title, index) => ({
      id: title,
      number: index + 1,
      title,
      complete: false,
      state: index === 0 ? "active" : "waiting"
    }));

  return (
    <section className="step-tracker" id="setup-flow" aria-label="Setup progress">
      {visibleStages.map((stage, index) => (
        <div className={`step-item ${stage.state}`} key={stage.id}>
          <div className="step-node">
            {stage.complete ? <CheckCircle2 aria-hidden="true" /> : stage.number}
          </div>
          <span>{stage.title}</span>
          {index < visibleStages.length - 1 && <div className="step-line" aria-hidden="true" />}
        </div>
      ))}
    </section>
  );
}

function CurrentActionBanner({ activeStage, loading }) {
  if (!activeStage) return null;

  return (
    <section className="current-action">
      <div className="action-icon">
        {activeStage.icon}
      </div>
      <div className="action-copy">
        <span>{activeStage.complete ? "FINAL STEP" : "CURRENT ACTION"}</span>
        <h2>{activeStage.title}</h2>
        <p>{activeStage.body}</p>
        <small><CheckCircle2 aria-hidden="true" />{activeStage.helper}</small>
      </div>
      <Button
        variant="hero"
        icon={activeStage.icon}
        onClick={activeStage.onAction}
        busy={loading && activeStage.id === "computer"}
      >
        {activeStage.action}
      </Button>
    </section>
  );
}

function GuidedStepCard({ activeStage, stages, loading }) {
  if (!activeStage) return null;
  const stepCount = stages.length || setupStepLabels.length;

  return (
    <section className="guided-step-card" aria-label="Current setup step">
      <div className="guided-copy">
        <span>{activeStage.kicker || `Step ${activeStage.number} of ${stepCount}`}</span>
        <h2>{activeStage.title}</h2>
        <p>{activeStage.body}</p>
        <small>{activeStage.helper}</small>
      </div>
      <Button
        variant="hero"
        icon={activeStage.icon}
        onClick={activeStage.onAction}
        busy={loading}
      >
        {activeStage.action}
      </Button>
    </section>
  );
}

function ProgressCard({ score, stages, diagnostics }) {
  const completeStages = stages.filter((stage) => stage.complete).length;
  const totalStages = stages.length || setupStepLabels.length;

  return (
    <section className="card progress-card">
      <h2>Overall Progress</h2>
      <p className="muted">Last checked {diagnostics ? new Date(diagnostics.checkedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "just now"}</p>
      <div className="progress-bar">
        <span style={{ width: `${Math.round((completeStages / totalStages) * 100)}%` }} />
      </div>
      <div className="progress-count">
        <strong>{completeStages}</strong>
        <span>of {totalStages} steps complete</span>
      </div>
      <div className="soft-status">
        <CheckCircle2 aria-hidden="true" />
        <div>
          <strong>{score.good === score.total ? "Everything looks good." : "Keep following the guided steps."}</strong>
          <span>{score.good} of {score.total} checks ready</span>
        </div>
      </div>
    </section>
  );
}

function CheckMiniRow({ icon, label, detail, ready }) {
  return (
    <div className="check-mini-row">
      <div className="mini-icon">{icon}</div>
      <div>
        <strong>{label}</strong>
        <span>{detail}</span>
      </div>
      <CheckCircle2 className={ready ? "ready" : "pending"} aria-hidden="true" />
    </div>
  );
}

function SetupChecksCard({ diagnostics }) {
  if (!diagnostics) {
    return (
      <section className="card setup-checks-card">
        <div className="card-title-row">
          <h2>Setup Checks</h2>
          <span>View all</span>
        </div>
        <div className="loading-state"><Loader2 className="spin" />Running checks...</div>
      </section>
    );
  }

  return (
    <section className="card setup-checks-card" id="details">
      <div className="card-title-row">
        <h2>Setup Checks</h2>
        <a href="#diagnostics">View all</a>
      </div>
      <CheckMiniRow icon={<MonitorCheck />} label="Computer" detail={`${diagnostics.platform.os} ${diagnostics.platform.arch}`} ready />
      <CheckMiniRow icon={<Cloud />} label="Dailey Connector" detail={diagnostics.tools.dailey.detail} ready={diagnostics.tools.dailey.found && diagnostics.tools.daileyMcp.found} />
      <CheckMiniRow icon={<GitBranch />} label="GitHub" detail={diagnostics.accounts.github.detail} ready={diagnostics.accounts.github.connected} />
      <CheckMiniRow icon={<ShieldCheck />} label="Dailey Account" detail={diagnostics.accounts.dailey.detail} ready={diagnostics.accounts.dailey.connected} />
    </section>
  );
}

function AIAppConnectionsCard({ diagnostics, configureClient, busyAction }) {
  const cards = clientCards.map((client) => {
    const state = diagnostics?.clients?.[client.id];
    const installed = Boolean(state?.installed);
    const connected = Boolean(installed && state?.daileyBlockLooksValid);
    const configuredWithoutApp = Boolean(!installed && state?.daileyBlockLooksValid);
    const missing = Boolean(diagnostics && !installed);
    const status = connected
      ? "Connected"
      : installed
      ? "Found"
      : configuredWithoutApp
      ? "App missing"
      : missing
      ? "Not installed"
      : "Checking";
    const buttonLabel = !diagnostics
      ? "Checking..."
      : connected
      ? "Connected"
      : missing
      ? `Get ${client.shortName}`
      : `Connect ${client.shortName}`;
    const detail = state?.detail || client.description;

    return {
      ...client,
      state,
      installed,
      connected,
      missing,
      status,
      buttonLabel,
      detail
    };
  });
  const installedCards = diagnostics ? cards.filter((client) => client.installed) : cards;
  const missingCards = diagnostics ? cards.filter((client) => !client.installed) : [];
  const connectedCount = cards.filter((client) => client.connected).length;

  function renderCard(client) {
    return (
      <div className={`ai-mini-card ${client.accent} ${client.connected ? "connected" : ""} ${client.missing ? "missing" : ""}`} key={client.id}>
        <div className="ai-topline">
          <div className="ai-icon">{client.icon}</div>
          <span>{client.status}</span>
        </div>
        <h3>{client.name}</h3>
        <p>{client.missing ? client.detail : client.description}</p>
        {client.missing ? (
          <button className="install-text-link" onClick={() => api.openUrl(client.installUrl)}>
            <Link aria-hidden="true" />
            <span>Install {client.shortName}</span>
          </button>
        ) : (
          <Button
            icon={client.connected ? <CheckCircle2 aria-hidden="true" /> : !diagnostics ? <Loader2 className="spin" aria-hidden="true" /> : <Link aria-hidden="true" />}
            onClick={() => configureClient(client.id)}
            busy={busyAction === client.id}
            disabled={!diagnostics}
          >
            {client.buttonLabel}
          </Button>
        )}
      </div>
    );
  }

  return (
    <section className="card ai-card" id="ai-apps">
      <div className="ai-card-heading">
        <div>
          <h2>Connect Your AI App</h2>
          <p className="muted">
            {diagnostics
              ? installedCards.length > 0
                ? `${installedCards.length} supported app${installedCards.length === 1 ? "" : "s"} found on this Mac.`
                : "No supported AI apps were found on this Mac yet."
              : "Checking this Mac for supported AI apps..."}
          </p>
        </div>
        {diagnostics && (
          <span className="ai-count-pill">
            {connectedCount} connected
          </span>
        )}
      </div>

      {installedCards.length > 0 && (
        <div className="ai-group">
          <div className="ai-group-title">
            <strong>{diagnostics ? "Found on this Mac" : "Checking installed apps"}</strong>
            <span>{diagnostics ? "Connect Dailey to one of these installed apps." : "The assistant is scanning your Applications folder and command tools."}</span>
          </div>
          <div className="ai-mini-grid">
            {installedCards.map(renderCard)}
          </div>
        </div>
      )}

      {diagnostics && missingCards.length > 0 && (
        <div className="ai-group secondary">
          <div className="ai-group-title">
            <strong>Available to install</strong>
            <span>These are supported, but not installed here.</span>
          </div>
          <div className="ai-mini-grid">
            {missingCards.map(renderCard)}
          </div>
        </div>
      )}
    </section>
  );
}

function QuickActionsCard({ openTerminal, configureClient, busyAction }) {
  const actions = [
    {
      title: "Open Dailey Setup",
      caption: "Sign in and connect your Dailey account",
      icon: <Cloud />,
      onClick: () => openTerminal("dailey setup", "dailey"),
      busy: busyAction === "dailey"
    },
    {
      title: "Open GitHub Login",
      caption: "Start GitHub login through the CLI",
      icon: <GitBranch />,
      onClick: () => openTerminal("gh auth login", "github"),
      busy: busyAction === "github"
    },
    {
      title: "Update Codex Config",
      caption: "Reload and validate your Codex config",
      icon: <Code2 />,
      onClick: () => configureClient("codex"),
      busy: busyAction === "codex"
    },
    {
      title: "Open Dailey Docs",
      caption: "Open the getting started guide",
      icon: <BookOpen />,
      onClick: () => api.openUrl("https://docs.dailey.cloud/docs/getting-started")
    }
  ];

  return (
    <section className="card quick-actions">
      {actions.map((action) => (
        <button className="quick-action" onClick={action.onClick} disabled={action.busy} key={action.title}>
          <div className="quick-icon">{action.busy ? <Loader2 className="spin" /> : action.icon}</div>
          <div>
            <strong>{action.title}</strong>
            <span>{action.caption}</span>
          </div>
          <ChevronRight aria-hidden="true" />
        </button>
      ))}
    </section>
  );
}

function InstallerLogCard({ logs, onOpenFullLog, showSampleLogs }) {
  const sample = [
    "11:06:13  Checking system requirements...",
    "11:06:18  All system checks passed",
    "11:06:21  Dailey AI connector is up to date",
    "11:06:21  Ready for final restart and check."
  ];

  return (
    <section className="card installer-log" id="logs">
      <div className="card-title-row">
        <div>
          <h2>Installer Log</h2>
          <p className="muted">Live output and installation progress.</p>
        </div>
        <button onClick={onOpenFullLog}>View full log</button>
      </div>
      <div className="terminal-output">
        {logs.length === 0 && showSampleLogs
          ? sample.map((line) => <code key={line}>{line}</code>)
          : logs.length === 0
          ? <code>No installer output yet.</code>
          : logs.map((item) => <code key={item.id}>{item.at}  {item.line.trim()}</code>)}
      </div>
    </section>
  );
}

function stageReportRows(stage, diagnostics, connectedAiIds) {
  if (!diagnostics) {
    return [
      ["Current scan", "Checking this Mac before setup starts.", false, <Loader2 className="spin" />]
    ];
  }

  const connectedAiNames = connectedAiIds
    .map((id) => clientCards.find((client) => client.id === id)?.name || id)
    .join(", ");
  const installedAi = clientCards
    .filter((client) => diagnostics.clients[client.id]?.installed)
    .map((client) => client.name)
    .join(", ");

  if (stage?.id === "prepare") {
    return [
      ["Node.js", diagnostics.tools.node.detail, diagnostics.tools.node.found, <Cpu />],
      ["npm", diagnostics.tools.npm.detail, diagnostics.tools.npm.found, <Terminal />],
      ["GitHub CLI", diagnostics.tools.gh.detail, diagnostics.tools.gh.found, <GitBranch />],
      ["Dailey CLI", diagnostics.tools.dailey.detail, diagnostics.tools.dailey.found, <Cloud />],
      ["Dailey Connector", diagnostics.tools.daileyMcp.detail, diagnostics.tools.daileyMcp.found, <Unplug />]
    ];
  }

  if (stage?.id === "dailey") {
    return [
      ["Dailey account", diagnostics.accounts.dailey.detail, diagnostics.accounts.dailey.connected, <ShieldCheck />],
      ["Dailey CLI", diagnostics.tools.dailey.detail, diagnostics.tools.dailey.found, <Cloud />],
      ["Project access", diagnostics.projects.detail, diagnostics.projects.available, <MonitorCheck />]
    ];
  }

  if (stage?.id === "github") {
    return [
      ["GitHub sign-in", diagnostics.accounts.github.detail, diagnostics.accounts.github.connected, <GitBranch />],
      ["GitHub CLI", diagnostics.tools.gh.detail, diagnostics.tools.gh.found, <Terminal />],
      ["Next check", "After sign-in, the assistant will look for your AI app.", diagnostics.accounts.github.connected, <ChevronRight />]
    ];
  }

  if (stage?.id === "reload") {
    return [
      ["Connected AI app", connectedAiNames || "Connect one AI app first.", connectedAiIds.length > 0, <Code2 />],
      ["Reload status", "Reload this app so the connector becomes available inside it.", false, <RefreshCw />],
      ["Final check", "After reload, the last page confirms everything is ready.", false, <CheckCircle2 />]
    ];
  }

  if (stage?.id === "finish") {
    return [
      ["Dailey", diagnostics.accounts.dailey.detail, diagnostics.accounts.dailey.connected, <ShieldCheck />],
      ["GitHub", diagnostics.accounts.github.detail, diagnostics.accounts.github.connected, <GitBranch />],
      ["AI app", connectedAiNames || installedAi || "No connected AI app found yet.", connectedAiIds.length > 0, <Code2 />],
      ["Dailey projects", diagnostics.projects.detail, diagnostics.projects.available, <Cloud />]
    ];
  }

  return [
    ["Setup status", stage?.body || "Checking current setup stage.", Boolean(stage?.complete), stage?.icon || <MonitorCheck />]
  ];
}

function StageReportCard({ stage, diagnostics, connectedAiIds }) {
  const rows = stageReportRows(stage, diagnostics, connectedAiIds);

  return (
    <section className="card stage-report" id="stage-report">
      <div className="card-title-row">
        <div>
          <h2>{stage?.title || "Current Step"} Report</h2>
          <p className="muted">Only the checks that matter for this step.</p>
        </div>
      </div>
      <div className="stage-report-list">
        {rows.map(([label, detail, ready, icon]) => (
          <CheckMiniRow icon={icon} label={label} detail={detail} ready={ready} key={label} />
        ))}
      </div>
    </section>
  );
}

function StageLogCard({ stage, logs, onOpenFullLog, showSampleLogs }) {
  const sampleByStage = {
    loading: ["Checking this Mac...", "Reading existing Dailey, GitHub, and AI app settings."],
    prepare: ["Installer output will appear here.", "Keep this app open while Prepare this Mac runs."],
    dailey: ["Dailey sign-in opens in Terminal.", "Return here and press Refresh when sign-in is finished."],
    github: ["GitHub sign-in opens in Terminal.", "Return here and press Refresh when GitHub confirms login."],
    ai: ["AI app configuration backups are created before any file is changed.", "Choose one installed AI app to connect Dailey."],
    reload: ["Close and reopen your AI app if the automatic reload cannot complete.", "Then run the final check."],
    finish: ["Final check refreshes all setup status.", "The dashboard appears after everything is confirmed."]
  };
  const samples = sampleByStage[stage?.id] || sampleByStage.loading;
  const lines = logs.length > 0
    ? logs.map((item) => `${item.at}  ${item.line.trim()}`)
    : showSampleLogs
    ? samples
    : ["No output for this step yet."];

  return (
    <section className="card stage-log" id="logs">
      <div className="card-title-row">
        <div>
          <h2>{stage?.title || "Setup"} Log</h2>
          <p className="muted">Step-specific status and command output.</p>
        </div>
        <button onClick={onOpenFullLog}>View full log</button>
      </div>
      <div className="terminal-output">
        {lines.map((line) => <code key={line}>{line}</code>)}
      </div>
    </section>
  );
}

function WelcomeScreen({ onBegin }) {
  return (
    <section className="setup-welcome-screen" id="overview">
      <div className="welcome-visual" aria-hidden="true">
        <img src={introHero} alt="" />
      </div>
      <div className="setup-welcome-copy">
        <span>Welcome</span>
        <h1>Let's set up Dailey on this Mac.</h1>
        <p>We will go one step at a time: Dailey, GitHub, your AI app, then a final check. Nothing else appears until it is needed.</p>
        <Button variant="hero" icon={<ChevronRight aria-hidden="true" />} onClick={onBegin}>
          Begin setup
        </Button>
      </div>
    </section>
  );
}

function SetupDots({ stages, activeStage }) {
  const visibleStages = stages.length > 0
    ? stages
    : setupStepLabels.map((title, index) => ({
      id: title,
      number: index + 1,
      title,
      complete: false,
      state: activeStage?.number === index + 1 ? "active" : "waiting"
    }));

  return (
    <div className="setup-dots" aria-label="Setup progress">
      {visibleStages.map((stage) => (
        <span
          className={`${stage.state} ${activeStage?.id === stage.id ? "active" : ""}`}
          title={stage.title}
          key={stage.id}
        />
      ))}
    </div>
  );
}

function focusedStageRows(stage, diagnostics, connectedAiIds) {
  const rows = stageReportRows(stage, diagnostics, connectedAiIds);

  if (stage?.id === "dailey") return rows.filter(([label]) => label === "Dailey account");
  if (stage?.id === "github") return rows.filter(([label]) => label === "GitHub sign-in");
  if (stage?.id === "ai") return [];
  if (stage?.id === "loading") return rows.slice(0, 1);
  return rows.slice(0, 3);
}

function FocusedStatusPanel({ stage, diagnostics, connectedAiIds }) {
  const rows = focusedStageRows(stage, diagnostics, connectedAiIds);
  if (rows.length === 0) return null;

  return (
    <div className="focused-status-panel">
      {rows.map(([label, detail, ready, icon]) => (
        <div className="focused-status-row" key={label}>
          <div className={ready ? "ready" : "pending"}>{icon}</div>
          <div>
            <strong>{label}</strong>
            <span>{detail}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function AIPlatformChooser({ diagnostics, configureClient, busyAction }) {
  const cards = clientCards.map((client) => {
    const state = diagnostics?.clients?.[client.id];
    const installed = Boolean(state?.installed);
    const connected = Boolean(installed && state?.daileyBlockLooksValid);
    const missing = Boolean(diagnostics && !installed);
    return {
      ...client,
      installed,
      connected,
      missing,
      detail: state?.detail || client.description
    };
  });

  return (
    <div className="setup-choice-grid" id="ai-apps">
      {cards.map((client) => (
        <div className={`setup-choice-card ${client.accent} ${client.connected ? "connected" : ""}`} key={client.id}>
          <div className="setup-choice-icon">{client.icon}</div>
          <h3>{client.name}</h3>
          <p>{client.missing ? client.detail : client.description}</p>
          {client.missing ? (
            <button className="install-text-link" onClick={() => api.openUrl(client.installUrl)}>
              <Link aria-hidden="true" />
              <span>Install {client.shortName}</span>
            </button>
          ) : (
            <Button
              icon={client.connected ? <CheckCircle2 aria-hidden="true" /> : <Link aria-hidden="true" />}
              onClick={() => configureClient(client.id)}
              busy={busyAction === client.id}
              disabled={!diagnostics || client.connected}
            >
              {client.connected ? "Connected" : `Connect ${client.shortName}`}
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

function FocusedStepScreen({ activeStage, stages, loading, busyAction, diagnostics, configureClient, connectedAiIds, message, onRefresh }) {
  if (!activeStage) return null;

  const stepCount = stages.length || setupStepLabels.length;
  const showAiChooser = activeStage.id === "ai";
  const actionBusy = loading ||
    (activeStage.id === "dailey" && busyAction === "dailey") ||
    (activeStage.id === "github" && busyAction === "github") ||
    (activeStage.id === "reload" && busyAction === "reload") ||
    (activeStage.id === "finish" && busyAction === "finish") ||
    (activeStage.id === "prepare" && busyAction === "prepare");
  const canCheckAgain = ["dailey", "github"].includes(activeStage.id);

  return (
    <section className={`setup-step-screen stage-${activeStage.id}`}>
      <div className="setup-step-shell">
        <div className="step-orb" aria-hidden="true">{activeStage.icon}</div>
        <span className="setup-step-kicker">{activeStage.kicker || `Step ${activeStage.number} of ${stepCount}`}</span>
        <h1>{activeStage.title}</h1>
        <p>{activeStage.body}</p>
        <small>{activeStage.helper}</small>
        <div className="setup-step-actions">
          <Button
            variant="hero"
            icon={activeStage.icon}
            onClick={activeStage.onAction}
            busy={actionBusy}
          >
            {activeStage.action}
          </Button>
          {canCheckAgain && (
            <Button icon={<RefreshCw aria-hidden="true" />} onClick={onRefresh} busy={loading}>
              Check again
            </Button>
          )}
        </div>
        {message && <div className="message setup-message">{message}</div>}
        {showAiChooser ? (
          <AIPlatformChooser diagnostics={diagnostics} configureClient={configureClient} busyAction={busyAction} />
        ) : (
          <FocusedStatusPanel stage={activeStage} diagnostics={diagnostics} connectedAiIds={connectedAiIds} />
        )}
      </div>
      <SetupDots stages={stages} activeStage={activeStage} />
    </section>
  );
}

function DashboardWelcome({ diagnostics }) {
  const checkedTime = diagnostics
    ? new Date(diagnostics.checkedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "just now";

  return (
    <section className="dashboard-welcome" id="overview">
      <div>
        <span>Setup complete</span>
        <h1>You're configured and set up.</h1>
        <p>Here is your dashboard. From here you can review connections, open quick actions, and troubleshoot only when you need to.</p>
      </div>
      <div className="welcome-badge">
        <CheckCircle2 aria-hidden="true" />
        <strong>Ready</strong>
        <span>Last checked {checkedTime}</span>
      </div>
    </section>
  );
}

function DashboardView({ diagnostics, score, stages, configureClient, busyAction, openTerminal, logs, settings, onOpenFullLog }) {
  return (
    <>
      <DashboardWelcome diagnostics={diagnostics} />
      <StepTracker stages={stages} />
      <div className="main-card-grid">
        <ProgressCard score={score} stages={stages} diagnostics={diagnostics} />
        <SetupChecksCard diagnostics={diagnostics} />
        <AIAppConnectionsCard diagnostics={diagnostics} configureClient={configureClient} busyAction={busyAction} />
      </div>

      <div className="bottom-grid">
        <QuickActionsCard openTerminal={openTerminal} configureClient={configureClient} busyAction={busyAction} />
        <InstallerLogCard logs={logs} onOpenFullLog={onOpenFullLog} showSampleLogs={settings.showSampleLogs} />
      </div>

      <DiagnosticsList diagnostics={diagnostics} visible={settings.showDiagnostics} />
    </>
  );
}

function DiagnosticsList({ diagnostics, visible }) {
  if (!visible) return null;
  if (!diagnostics) return null;

  const rows = [
    ["Computer", `${diagnostics.platform.os} ${diagnostics.platform.arch}`, true, <MonitorCheck />],
    ["Node.js Support Tool", diagnostics.tools.node.detail, diagnostics.tools.node.found, <Cpu />],
    ["Dailey Command Tool", diagnostics.tools.dailey.detail, diagnostics.tools.dailey.found, <Cloud />],
    ["Dailey AI Connector", diagnostics.tools.daileyMcp.detail, diagnostics.tools.daileyMcp.found, <Unplug />],
    ["GitHub", diagnostics.accounts.github.detail, diagnostics.accounts.github.connected, <GitBranch />],
    ["Dailey Account", diagnostics.accounts.dailey.detail, diagnostics.accounts.dailey.connected, <ShieldCheck />],
    ["Codex Connection", diagnostics.clients.codex.installed ? diagnostics.clients.codex.daileyBlockLooksValid ? diagnostics.clients.codex.path : "Dailey is not connected in Codex yet" : diagnostics.clients.codex.detail, diagnostics.clients.codex.installed && diagnostics.clients.codex.daileyBlockLooksValid, <Code2 />],
    ["Claude Desktop Connection", diagnostics.clients.claude.installed ? diagnostics.clients.claude.daileyBlockLooksValid ? diagnostics.clients.claude.path : "Dailey is not connected in Claude Desktop yet" : diagnostics.clients.claude.detail, diagnostics.clients.claude.installed && diagnostics.clients.claude.daileyBlockLooksValid, <Laptop />],
    ["OpenCode Connection", diagnostics.clients.opencode.installed ? diagnostics.clients.opencode.daileyBlockLooksValid ? diagnostics.clients.opencode.path : "Dailey is not connected in OpenCode yet" : diagnostics.clients.opencode.detail, diagnostics.clients.opencode.installed && diagnostics.clients.opencode.daileyBlockLooksValid, <Terminal />]
  ];

  return (
    <section className="card diagnostics-list" id="diagnostics">
      <div className="card-title-row">
        <div>
          <h2>Full Diagnostics</h2>
          <p className="muted">Support details for troubleshooting.</p>
        </div>
      </div>
      <div className="diagnostic-grid">
        {rows.map(([label, detail, ready, icon]) => (
          <div className="diagnostic-row" key={label}>
            <div className="mini-icon">{icon}</div>
            <div>
              <strong>{label}</strong>
              <span>{detail}</span>
            </div>
            <CheckCircle2 className={ready ? "ready" : "pending"} aria-hidden="true" />
          </div>
        ))}
      </div>
    </section>
  );
}

function Modal({ title, children, onClose, wide = false }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className={`modal ${wide ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <span>Dailey Setup Assistant</span>
            <h2>{title}</h2>
          </div>
          <IconButton icon={<X />} label="Close" onClick={onClose} />
        </div>
        {children}
      </section>
    </div>
  );
}

function ToggleRow({ title, body, checked, onChange }) {
  return (
    <label className="toggle-row">
      <div>
        <strong>{title}</strong>
        <span>{body}</span>
      </div>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

function SettingsPanel({ settings, setSettings, theme, setTheme, onClose }) {
  return (
    <Modal title="Settings" onClose={onClose}>
      <div className="settings-stack">
        <ToggleRow
          title="Dark mode"
          body="Switch the assistant to a darker interface for low-light work."
          checked={theme === "dark"}
          onChange={(checked) => setTheme(checked ? "dark" : "light")}
        />
        <ToggleRow
          title="Show full diagnostics"
          body="Display the detailed troubleshooting report at the bottom of the app."
          checked={settings.showDiagnostics}
          onChange={(checked) => setSettings((current) => ({ ...current, showDiagnostics: checked }))}
        />
        <ToggleRow
          title="Show sample installer log"
          body="Keep a helpful example log visible when no installer has run yet."
          checked={settings.showSampleLogs}
          onChange={(checked) => setSettings((current) => ({ ...current, showSampleLogs: checked }))}
        />
        <ToggleRow
          title="Compact layout"
          body="Reduce spacing slightly so more of the setup guide fits on screen."
          checked={settings.compact}
          onChange={(checked) => setSettings((current) => ({ ...current, compact: checked }))}
        />
      </div>
    </Modal>
  );
}

function HelpGuide({ onClose, onOpenDocs }) {
  const steps = [
    ["Sign in to Dailey", "Connects this Mac to your Dailey account or managed client account."],
    ["Sign in to GitHub", "Connects the GitHub account that has access to the website or app repository."],
    ["Choose your AI platform", "Adds Dailey to Codex, Claude Desktop, or OpenCode. A backup is created first."],
    ["Reload your AI app", "Reloads the AI app so it picks up the new Dailey connector."],
    ["Finish setup", "Runs the final check and tells you what to ask your AI app next."]
  ];

  return (
    <Modal title="Help Guide" onClose={onClose} wide>
      <div className="help-intro">
        <LogoMark />
        <div>
          <h3>What this assistant does</h3>
          <p>It guides a non-technical user through connecting Dailey, GitHub, and their AI app without needing to understand terminal setup details.</p>
        </div>
      </div>
      <div className="help-steps">
        {steps.map(([title, body], index) => (
          <div className="help-step" key={title}>
            <span>{index + 1}</span>
            <div>
              <strong>{title}</strong>
              <p>{body}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="modal-actions">
        <Button icon={<BookOpen aria-hidden="true" />} onClick={onOpenDocs}>Open Dailey Docs</Button>
        <Button icon={<CheckCircle2 aria-hidden="true" />} variant="hero" onClick={onClose}>Got it</Button>
      </div>
    </Modal>
  );
}

function FullLogModal({ logs, onClose }) {
  const lines = logs.length
    ? logs.map((item) => `${item.at}  ${item.line.trim()}`)
    : [
      "No installer output yet.",
      "Run Install Dailey Connector to see live install progress here."
    ];

  return (
    <Modal title="Full Installer Log" onClose={onClose} wide>
      <div className="terminal-output full">
        {lines.map((line) => <code key={line}>{line}</code>)}
      </div>
    </Modal>
  );
}

function App() {
  const [diagnostics, setDiagnostics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState("");
  const [logs, setLogs] = useState([]);
  const [message, setMessage] = useState("");
  const [aiReloaded, setAiReloaded] = useState(false);
  const [finalChecked, setFinalChecked] = useState(false);
  const [hasStartedSetup, setHasStartedSetup] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("dailey-theme") || "light");
  const [modal, setModal] = useState("");
  const [settings, setSettings] = useState(() => {
    try {
      return {
        showDiagnostics: true,
        showSampleLogs: true,
        compact: false,
        ...JSON.parse(localStorage.getItem("dailey-settings") || "{}")
      };
    } catch {
      return { showDiagnostics: true, showSampleLogs: true, compact: false };
    }
  });

  async function refresh() {
    setLoading(true);
    setMessage("");
    try {
      const data = await api.diagnostics();
      setDiagnostics(data);
    } catch (error) {
      setMessage(`Could not run diagnostics: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    return api.onLog((payload) => {
      setLogs((current) => [
        { id: crypto.randomUUID(), at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }), ...payload },
        ...current
      ].slice(0, 80));
    });
  }, []);

  useEffect(() => {
    localStorage.setItem("dailey-theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("dailey-settings", JSON.stringify(settings));
  }, [settings]);

  const score = useMemo(() => {
    if (!diagnostics) return { good: 0, total: 9 };
    const hasConnectedAiApp = Object.values(diagnostics.clients).some((client) => client.installed && client.daileyBlockLooksValid);
    const checks = [
      diagnostics.tools.node.found,
      diagnostics.tools.npm.found,
      diagnostics.tools.gh.found,
      diagnostics.tools.dailey.found,
      diagnostics.tools.daileyMcp.found,
      diagnostics.accounts.github.connected,
      diagnostics.accounts.dailey.connected,
      hasConnectedAiApp,
      aiReloaded
    ];
    return { good: checks.filter(Boolean).length, total: checks.length };
  }, [diagnostics, aiReloaded]);

  const stages = useMemo(() => {
    if (!diagnostics) return [];

    const hasAiApp = Object.values(diagnostics.clients).some((client) => client.installed && client.daileyBlockLooksValid);
    const installedAiCards = clientCards.filter((client) => diagnostics.clients[client.id]?.installed);
    const firstUnconfiguredAiApp = installedAiCards.find((client) => !diagnostics.clients[client.id]?.daileyBlockLooksValid);
    const installedAiNames = installedAiCards.map((client) => client.name).join(", ");
    const aiStepBody = installedAiCards.length === 0
      ? "No supported AI app was found on this Mac yet. Choose one of the supported apps below if you want Dailey tools there."
      : installedAiCards.length === 1
      ? `${installedAiCards[0].name} was found on this Mac. Connect Dailey to it now.`
      : `${installedAiNames} were found on this Mac. Choose which one should get Dailey tools.`;
    const aiStepAction = firstUnconfiguredAiApp && installedAiCards.length === 1
      ? `Connect ${firstUnconfiguredAiApp.shortName}`
      : installedAiCards.length === 0
      ? "See install links"
      : "Choose found app";
    const aiStepActionHandler = firstUnconfiguredAiApp && installedAiCards.length === 1
      ? () => configureClient(firstUnconfiguredAiApp.id)
      : () => document.getElementById("ai-apps")?.scrollIntoView({ behavior: "smooth" });
    const items = [
      {
        id: "dailey",
        number: 1,
        title: "Sign in to Dailey",
        body: "Connect this Mac to your Dailey account so the assistant can find your projects.",
        helper: "This is your first user step. Use the Dailey account or managed client account you expect to work with.",
        complete: diagnostics.accounts.dailey.connected,
        action: "Sign in to Dailey",
        onAction: () => openTerminal("dailey setup", "dailey"),
        icon: <ShieldCheck aria-hidden="true" />
      },
      {
        id: "github",
        number: 2,
        title: "Sign in to GitHub",
        body: "Connect the GitHub account that can access the websites or apps you want Dailey to deploy.",
        helper: "This prototype uses GitHub's official CLI sign-in. A production version should use native GitHub OAuth so the terminal disappears.",
        complete: diagnostics.accounts.github.connected,
        action: "Sign in to GitHub",
        onAction: () => openTerminal("gh auth login", "github"),
        icon: <GitBranch aria-hidden="true" />
      },
      {
        id: "ai",
        number: 3,
        title: "Choose your AI platform",
        body: aiStepBody,
        helper: "The assistant scans this Mac first and only connects apps it can actually find.",
        complete: hasAiApp,
        action: aiStepAction,
        onAction: aiStepActionHandler,
        icon: <Code2 aria-hidden="true" />
      },
      {
        id: "reload",
        number: 4,
        title: "Reload your AI app",
        body: "Reload the AI app you connected so it can pick up the new Dailey tools.",
        helper: "AI apps usually read connector settings only when they open. This button tries to do the reload for you.",
        complete: aiReloaded,
        action: "Reload AI app",
        onAction: reloadAiApps,
        icon: <RefreshCw aria-hidden="true" />
      },
      {
        id: "finish",
        number: 5,
        title: "Finish setup",
        body: "Run one final check and confirm Dailey is ready inside your AI app.",
        helper: "After this, ask your AI app to list your Dailey projects.",
        complete: finalChecked && aiReloaded && hasAiApp && diagnostics.accounts.dailey.connected && diagnostics.accounts.github.connected,
        action: "Run final check",
        onAction: runFinalCheck,
        icon: <CheckCircle2 aria-hidden="true" />
      }
    ];

    const firstIncompleteIndex = items.findIndex((item) => !item.complete);
    return items.map((item, index) => ({
      ...item,
      state: item.complete ? "done" : index === firstIncompleteIndex ? "active" : "waiting"
    }));
  }, [diagnostics, aiReloaded, finalChecked]);

  const prerequisitesReady = Boolean(
    diagnostics?.tools.node.found &&
    diagnostics?.tools.npm.found &&
    diagnostics?.tools.gh.found &&
    diagnostics?.tools.dailey.found &&
    diagnostics?.tools.daileyMcp.found
  );
  const preflightStage = diagnostics && !prerequisitesReady ? {
    id: "prepare",
    number: 0,
    kicker: "Preparation",
    title: "Prepare this Mac",
    body: "Install the small Dailey connector pieces this Mac needs before account sign-in.",
    helper: "This is the only technical step. The rest of setup is account sign-in and app selection.",
    complete: false,
    action: "Prepare this Mac",
    onAction: installTools,
    icon: <Wrench aria-hidden="true" />
  } : null;
  const loadingStage = !diagnostics ? {
    id: "loading",
    number: 1,
    kicker: "Getting things ready",
    title: "Checking this Mac",
    body: "The assistant is checking what is already connected before it asks you to do anything.",
    helper: "This first check is automatic.",
    action: "Checking...",
    onAction: refresh,
    icon: <Loader2 className="spin" aria-hidden="true" />
  } : null;
  const activeStage = loadingStage || preflightStage || stages.find((stage) => stage.state === "active") || stages[stages.length - 1];
  const setupComplete = Boolean(!loadingStage && !preflightStage && stages.length > 0 && stages.every((stage) => stage.complete));
  const allReady = setupComplete;
  const connectedAiIds = diagnostics ? Object.entries(diagnostics.clients)
    .filter(([, client]) => client.installed && client.daileyBlockLooksValid)
    .map(([id]) => id) : [];

  async function configureClient(client) {
    setBusyAction(client);
    setMessage("");
    try {
      const result = await api.configureClient(client);
      const clientName = clientCards.find((item) => item.id === client)?.name || client;
      setMessage(`${clientName} is connected. Backup created at ${result.backupPath}`);
      setAiReloaded(false);
      setFinalChecked(false);
      await refresh();
    } catch (error) {
      setMessage(`Could not update config: ${error.message}`);
    } finally {
      setBusyAction("");
    }
  }

  async function openTerminal(command, label) {
    setBusyAction(label);
    setMessage("");
    try {
      await api.openTerminal(command);
      setMessage("A guided sign-in command opened. Follow the prompts, then come back here and press Refresh.");
    } catch (error) {
      setMessage(`Could not open Terminal: ${error.message}`);
    } finally {
      setBusyAction("");
    }
  }

  function installTools() {
    setLogs([]);
    setMessage("The Dailey connector installer started. Keep this app open while it works.");
    api.installTools();
  }

  async function reloadAiApps() {
    setBusyAction("reload");
    setMessage("");
    try {
      const result = await api.restartAiApps(connectedAiIds);
      setAiReloaded(true);
      setFinalChecked(false);
      setMessage(result.ok
        ? `Reload attempted: ${result.detail}. Run the final check when the app reopens.`
        : `${result.detail} If needed, close and reopen your AI app manually.`);
      await refresh();
    } catch (error) {
      setMessage(`Could not reload AI apps automatically. Close and reopen your AI app manually, then run the final check. ${error.message}`);
      setAiReloaded(true);
      setFinalChecked(false);
    } finally {
      setBusyAction("");
    }
  }

  async function runFinalCheck() {
    setBusyAction("finish");
    try {
      await refresh();
      setFinalChecked(true);
      setMessage("Setup is complete. Your dashboard is ready.");
    } finally {
      setBusyAction("");
    }
  }

  return (
    <main className={`app-shell ${theme} ${settings.compact ? "compact-mode" : ""}`}>
      {setupComplete ? (
        <>
          <TopBar
            ready={allReady}
            loading={loading}
            onRefresh={refresh}
            onToggleTheme={() => setTheme((current) => current === "dark" ? "light" : "dark")}
            onOpenHelp={() => setModal("help")}
            onOpenSettings={() => setModal("settings")}
            theme={theme}
          />
          <div className="app-body">
            <Sidebar
              diagnostics={diagnostics}
              loading={loading}
              onOpenSettings={() => setModal("settings")}
              stages={stages}
              activeStage={activeStage}
              setupComplete={setupComplete}
            />
            <section className="main-content">
              {message && <div className="message">{message}</div>}
              <DashboardView
                diagnostics={diagnostics}
                score={score}
                stages={stages}
                configureClient={configureClient}
                busyAction={busyAction}
                openTerminal={openTerminal}
                logs={logs}
                settings={settings}
                onOpenFullLog={() => setModal("logs")}
              />
            </section>
          </div>
        </>
      ) : (
        <>
          <SetupTopBar
            onToggleTheme={() => setTheme((current) => current === "dark" ? "light" : "dark")}
            onOpenHelp={() => setModal("help")}
            onOpenSettings={() => setModal("settings")}
            theme={theme}
          />
          <div className="setup-only-shell">
            {hasStartedSetup ? (
              <FocusedStepScreen
                activeStage={activeStage}
                stages={stages}
                loading={loading}
                busyAction={busyAction}
                diagnostics={diagnostics}
                configureClient={configureClient}
                connectedAiIds={connectedAiIds}
                message={message}
                onRefresh={refresh}
              />
            ) : (
              <WelcomeScreen onBegin={() => setHasStartedSetup(true)} />
            )}
          </div>
        </>
      )}
      {modal === "help" && (
        <HelpGuide
          onClose={() => setModal("")}
          onOpenDocs={() => api.openUrl("https://docs.dailey.cloud/docs/getting-started")}
        />
      )}
      {modal === "settings" && (
        <SettingsPanel
          settings={settings}
          setSettings={setSettings}
          theme={theme}
          setTheme={setTheme}
          onClose={() => setModal("")}
        />
      )}
      {modal === "logs" && <FullLogModal logs={logs} onClose={() => setModal("")} />}
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
