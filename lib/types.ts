export type Role = 'player' | 'teacher';
export type Hand = 'right' | 'left';
export type Style = 'aggressive' | 'defensive' | 'all-around';

export interface UserRow {
  id: string;
  email: string;
  name: string | null;
  role: Role | null;
  avatar_url: string | null;
  created_at: string;
}

export interface PlayerProfile {
  id: string;
  user_id: string;
  forehand: number | null;
  backhand: number | null;
  serve: number | null;
  volley: number | null;
  movement: number | null;
  mental: number | null;
  hand: Hand | null;
  style: Style | null;
  notes: string | null;
  updated_at: string;
}

export interface Opponent {
  id: string;
  owner_id: string;
  name: string;
  forehand: number | null;
  backhand: number | null;
  serve: number | null;
  volley: number | null;
  movement: number | null;
  mental: number | null;
  hand: Hand | null;
  style: Style | null;
  notes: string | null;
  created_at: string;
}

export interface Strategy {
  id: string;
  player_id: string;
  opponent_id: string;
  content: string;
  created_at: string;
  opponents?: Pick<Opponent, 'id' | 'name'>;
}

export type AttributeKey = 'forehand' | 'backhand' | 'serve' | 'volley' | 'movement' | 'mental';

export const ATTRIBUTE_LABELS: Record<AttributeKey, string> = {
  forehand: 'Forehand',
  backhand: 'Backhand',
  serve: 'Saque',
  volley: 'Voleio',
  movement: 'Movimentação',
  mental: 'Mental',
};
