import { useState } from 'react';
import { Plus, Trash2, ThumbsUp, Minus, ThumbsDown, Star, Utensils, MoreHorizontal } from 'lucide-react';
import { useStore } from '../store/useStore';
import { generateId } from '../utils/ids';
import type { Park, WishListItem } from '../types';

const PARKS: Park[] = ['Magic Kingdom', 'EPCOT', 'Hollywood Studios', 'Animal Kingdom'];

const TYPE_META = {
  attraction: { label: 'Attraction', icon: <Star size={13} />, color: 'bg-blue-100 text-blue-700' },
  dining:     { label: 'Dining',     icon: <Utensils size={13} />, color: 'bg-orange-100 text-orange-700' },
  other:      { label: 'Other',      icon: <MoreHorizontal size={13} />, color: 'bg-gray-100 text-gray-600' },
};

const VOTE_STYLES = {
  yes:   { active: 'bg-green-500 text-white border-green-500',   icon: <ThumbsUp size={13} />,   label: '👍 Yes' },
  maybe: { active: 'bg-amber-400 text-white border-amber-400',   icon: <Minus size={13} />,       label: '🤷 Maybe' },
  no:    { active: 'bg-red-400 text-white border-red-400',       icon: <ThumbsDown size={13} />,  label: '👎 No' },
};

export default function WishList() {
  const trip = useStore((s) => s.trip);
  const wishListItems = useStore((s) => s.wishListItems);
  const addWishListItem = useStore((s) => s.addWishListItem);
  const removeWishListItem = useStore((s) => s.removeWishListItem);
  const voteWishListItem = useStore((s) => s.voteWishListItem);
  const partyMembers = trip?.partyMembers ?? [];

  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<WishListItem['type']>('attraction');
  const [newPark, setNewPark] = useState<Park | ''>('');
  const [newNotes, setNewNotes] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [filterType, setFilterType] = useState<WishListItem['type'] | 'all'>('all');
  const [votingAs, setVotingAs] = useState<string>(partyMembers[0]?.id ?? '');

  const handleAdd = () => {
    if (!newName.trim()) return;
    addWishListItem({
      id: generateId(),
      name: newName.trim(),
      type: newType,
      park: newPark || undefined,
      notes: newNotes || undefined,
      votes: [],
    });
    setNewName('');
    setNewPark('');
    setNewNotes('');
    setShowForm(false);
  };

  const getScore = (item: WishListItem) =>
    item.votes.filter((v) => v.vote === 'yes').length * 2 +
    item.votes.filter((v) => v.vote === 'maybe').length;

  const filtered = wishListItems
    .filter((i) => filterType === 'all' || i.type === filterType)
    .slice()
    .sort((a, b) => getScore(b) - getScore(a));

  const myVote = (item: WishListItem) =>
    item.votes.find((v) => v.memberId === votingAs)?.vote ?? null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Group Wish List</h1>
          <p className="text-sm text-gray-500 mt-0.5">Add must-dos and let everyone vote. Sorted by group enthusiasm.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 bg-blue-700 text-white rounded-xl px-4 py-2 text-sm font-semibold hover:bg-blue-800"
        >
          <Plus size={16} /> Add
        </button>
      </div>

      {/* Voting as selector */}
      {partyMembers.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-3 flex items-center gap-3">
          <span className="text-sm text-gray-600 font-medium shrink-0">Voting as:</span>
          <div className="flex gap-2 flex-wrap">
            {partyMembers.map((m) => (
              <button
                key={m.id}
                onClick={() => setVotingAs(m.id)}
                className={`text-sm px-3 py-1 rounded-full border font-medium transition-colors ${
                  votingAs === m.id ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                }`}
              >
                {m.name || m.role}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['all', 'attraction', 'dining', 'other'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filterType === t ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
            }`}
          >
            {t === 'all' ? 'All' : TYPE_META[t].label}
          </button>
        ))}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-4 border border-blue-100 space-y-3">
          <h3 className="font-semibold text-gray-700 text-sm">Add to Wish List</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <select value={newType} onChange={(e) => setNewType(e.target.value as WishListItem['type'])}
                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="attraction">Attraction</option>
                <option value="dining">Dining</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Park (optional)</label>
              <select value={newPark} onChange={(e) => setNewPark(e.target.value as Park | '')}
                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Any / resort</option>
                {PARKS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="e.g. Tron Lightcycle / Run"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
            <input type="text" value={newNotes} onChange={(e) => setNewNotes(e.target.value)}
              placeholder="e.g. get LL for this one"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={!newName.trim()}
              className="flex-1 bg-blue-700 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-800 disabled:opacity-50">
              Add to List
            </button>
            <button onClick={() => setShowForm(false)}
              className="bg-gray-100 text-gray-600 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-200">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Wish list items */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <span className="text-4xl block mb-2">💭</span>
          <p className="text-sm">No items yet. Add your must-dos!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item, rank) => {
            const yesCount   = item.votes.filter((v) => v.vote === 'yes').length;
            const maybeCount = item.votes.filter((v) => v.vote === 'maybe').length;
            const noCount    = item.votes.filter((v) => v.vote === 'no').length;
            const meta = TYPE_META[item.type];
            const myV = myVote(item);

            return (
              <div key={item.id} className="bg-white rounded-xl shadow-sm p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-gray-800">#{rank + 1}</span>
                      <span className="font-semibold text-gray-800 text-sm truncate">{item.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${meta.color}`}>
                        {meta.icon}{meta.label}
                      </span>
                      {item.park && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{item.park}</span>
                      )}
                    </div>
                    {item.notes && <p className="text-xs text-gray-500 mt-0.5">{item.notes}</p>}
                  </div>
                  <button onClick={() => removeWishListItem(item.id)} className="text-gray-300 hover:text-red-400 shrink-0 p-0.5">
                    <Trash2 size={15} />
                  </button>
                </div>

                {/* Vote buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  {(Object.entries(VOTE_STYLES) as [keyof typeof VOTE_STYLES, (typeof VOTE_STYLES)[keyof typeof VOTE_STYLES]][]).map(([vote, style]) => (
                    <button
                      key={vote}
                      onClick={() => votingAs && voteWishListItem(item.id, votingAs, vote)}
                      disabled={!votingAs}
                      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border font-medium transition-colors disabled:opacity-40 ${
                        myV === vote ? style.active : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>

                {/* Vote tally */}
                {item.votes.length > 0 && (
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="text-green-600 font-medium">👍 {yesCount}</span>
                    <span className="text-amber-500 font-medium">🤷 {maybeCount}</span>
                    <span className="text-red-500 font-medium">👎 {noCount}</span>
                    <span className="ml-auto text-gray-400">{item.votes.length} vote{item.votes.length !== 1 ? 's' : ''}</span>
                  </div>
                )}

                {/* Per-member votes */}
                {item.votes.length > 0 && partyMembers.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {partyMembers.map((m) => {
                      const v = item.votes.find((vote) => vote.memberId === m.id);
                      return (
                        <span key={m.id} className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                          v?.vote === 'yes' ? 'bg-green-50 border-green-200 text-green-700' :
                          v?.vote === 'maybe' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                          v?.vote === 'no' ? 'bg-red-50 border-red-200 text-red-600' :
                          'bg-gray-50 border-gray-200 text-gray-400'
                        }`}>
                          {m.name || m.role}: {v ? (v.vote === 'yes' ? '👍' : v.vote === 'maybe' ? '🤷' : '👎') : '—'}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
