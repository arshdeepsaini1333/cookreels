export interface SocialUser {
  id: string
  firstName: string
  lastName: string
  username: string
  profileImage: string | null
  bio: string | null
  cuisineSpecialty: string | null
  level: string | null
  isVerified: boolean
  followersCount: number
  followingCount: number
  /** current viewer follows this user */
  isFollowing: boolean
  /** this user follows the current viewer */
  isFollowedBy: boolean
  /** mutual follow — both isFollowing and isFollowedBy */
  isFriend: boolean
}

export interface SocialCounts {
  friendsCount: number
  followersCount: number
  followingCount: number
}

export interface PaginatedUsers {
  users: SocialUser[]
  total: number
  page: number
  totalPages: number
}

export interface BlockedUser {
  id: string
  firstName: string
  lastName: string
  username: string
  profileImage: string | null
  isVerified: boolean
  blockedAt: string
}

export interface PaginatedBlockedUsers {
  users: BlockedUser[]
  total: number
  page: number
  totalPages: number
}
