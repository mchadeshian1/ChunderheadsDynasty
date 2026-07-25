import type { SleeperUser } from '../types/sleeper';

export function getUserAvatarUrl(user: SleeperUser): string | null {
  if (user.avatar) {
    return `https://sleepercdn.com/avatars/thumbs/${user.avatar}`;
  }
  if (user.metadata?.avatar) {
    return user.metadata.avatar;
  }
  return null;
}
