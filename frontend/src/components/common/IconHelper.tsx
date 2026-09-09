import React from 'react';
import {
  Rocket, Globe, Terminal, Server, Database, Bot,
  Gamepad2, Film, Music, Code, FolderGit2, Zap,
  Boxes, Cpu, Wifi, HardDrive, Package, Wrench,
  HelpCircle
} from 'lucide-react';

interface GlyphIconProps {
  name: string | null | undefined;
  size?: number;
  className?: string;
}

export const GlyphIcon: React.FC<GlyphIconProps> = ({ name, size = 20, className }) => {
  const props = { size, className };
  switch (name) {
    case 'rocket': return <Rocket {...props} />;
    case 'globe': return <Globe {...props} />;
    case 'terminal': return <Terminal {...props} />;
    case 'server': return <Server {...props} />;
    case 'database': return <Database {...props} />;
    case 'bot': return <Bot {...props} />;
    case 'gamepad-2': return <Gamepad2 {...props} />;
    case 'film': return <Film {...props} />;
    case 'music': return <Music {...props} />;
    case 'code': return <Code {...props} />;
    case 'folder-git-2': return <FolderGit2 {...props} />;
    case 'zap': return <Zap {...props} />;
    case 'container': return <Boxes {...props} />;
    case 'cpu': return <Cpu {...props} />;
    case 'wifi': return <Wifi {...props} />;
    case 'hard-drive': return <HardDrive {...props} />;
    case 'package': return <Package {...props} />;
    case 'wrench': return <Wrench {...props} />;
    default: return <HelpCircle {...props} />;
  }
};

