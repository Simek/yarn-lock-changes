export type StausType = 'ADDED' | 'DOWNGRADED' | 'REMOVED' | 'UPDATED';

export type ParsedLock = {
  type: 'error' | 'success';
  object: Record<string, ClassicYarnEntry | BerryYarnEntry>;
};

export type LockChanges = {
  previous: string;
  current: string;
  status: StausType;
};

export type ClassicYarnEntry = {
  version: string;
  resolved: string;
  integrity: string;
  dependencies: Record<string, string>;
};

export type BerryYarnEntry = {
  version: string;
  resolved: string;
  integrity: string;
  language: string;
  link: string;
  dependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
};
