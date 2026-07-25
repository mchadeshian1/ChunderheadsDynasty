import type { SleeperUser } from '../types/sleeper';
import { getUserAvatarUrl } from '../utils/avatarUrl';

interface TeamHeaderProps {
  user: SleeperUser;
}

export function TeamHeader({ user }: TeamHeaderProps) {
  const avatarUrl = getUserAvatarUrl(user);
  const teamName = (user.metadata?.team_name ?? user.display_name).trim();

  return (
    <div className="flex items-center gap-4 pb-4">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={teamName}
          className="h-12 w-12 rounded-full bg-gray-800 object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-800 text-lg font-bold text-gray-500">
          {user.display_name.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="min-w-0">
        <h2 className="truncate text-xl font-bold text-gray-100">{teamName}</h2>
        <p className="text-sm text-gray-400">{user.display_name}</p>
      </div>
    </div>
  );
}
