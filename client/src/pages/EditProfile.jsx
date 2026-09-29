import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Clock, ImageSquare, Trash } from '@phosphor-icons/react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Avatar } from '../components/ui.jsx';

const AVATAR_PX = 256;
const AVATAR_MAX_BYTES = 200 * 1024; // matches the server limit

/** Crops the picture to a centred square and shrinks it, so uploads stay small whatever the camera made. */
async function resizeImage(file) {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = AVATAR_PX;
  canvas
    .getContext('2d')
    .drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, AVATAR_PX, AVATAR_PX);
  bitmap.close?.();
  for (const quality of [0.85, 0.7, 0.5]) {
    let url = canvas.toDataURL('image/webp', quality);
    // Browsers without WebP encoding fall back to PNG; JPEG is much smaller than that.
    if (!url.startsWith('data:image/webp')) url = canvas.toDataURL('image/jpeg', quality);
    if ((url.length - url.indexOf(',') - 1) * 0.75 <= AVATAR_MAX_BYTES) return url;
  }
  throw new Error('That picture is too detailed to use, try another one');
}

const formatDate = (iso) => new Date(iso).toLocaleDateString(undefined, { dateStyle: 'long' });

export default function EditProfile() {
  const { updateUser } = useAuth();
  const fileInput = useRef(null);
  const [profile, setProfile] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [avatar, setAvatar] = useState(undefined); // undefined = unchanged, null = removed, string = new data URL
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = (p) => {
    setProfile(p);
    setDisplayName(p.displayName ?? '');
    setUsername(p.username);
    setAvatar(undefined);
  };

  useEffect(() => {
    api.get('/profile').then(
      (r) => load(r.profile),
      (err) => setError(err.message),
    );
  }, []);

  if (!profile) {
    return (
      <div className="settings-card">
        {error ? <p className="error" role="alert">{error}</p> : <div className="skeleton skeleton-line" style={{ width: '60%' }} />}
      </div>
    );
  }

  const nicknameLocked = Boolean(profile.usernameChangeAvailableAt);
  const nicknameChanged = username.trim() !== profile.username;
  const nameChanged = displayName.trim() !== (profile.displayName ?? '');
  const dirty = nicknameChanged || nameChanged || avatar !== undefined;
  const previewSrc = avatar === undefined ? profile.avatarUrl : avatar;

  const pickImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setSaved(false);
    if (!file.type.startsWith('image/')) return setError('Choose an image file');
    try {
      setAvatar(await resizeImage(file));
    } catch (err) {
      setError(err.message.startsWith('That picture') ? err.message : "Couldn't read that image, try another one");
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    const body = {};
    if (nameChanged) body.displayName = displayName;
    if (nicknameChanged) body.username = username;
    if (avatar !== undefined) body.avatar = avatar;
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      const r = await api.put('/profile', body);
      load(r.profile);
      updateUser({ username: r.profile.username, displayName: r.profile.displayName, avatarUrl: r.profile.avatarUrl });
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="settings-card">
      <div className="page-head">
        <h1>Edit profile</h1>
        <Link to={`/u/${profile.username}`} className="btn btn-ghost btn-sm">
          View profile
        </Link>
      </div>
      <form onSubmit={submit} className="stack settings-form">
        <div className="avatar-edit">
          <Avatar name={displayName.trim() || username || '?'} src={previewSrc} size="xl" />
          <div className="avatar-edit-actions">
            <span className="field-label">Profile image</span>
            <div className="row">
              <button type="button" className="btn btn-sm" onClick={() => fileInput.current.click()}>
                <ImageSquare size={16} aria-hidden="true" />
                {previewSrc ? 'Change image' : 'Upload image'}
              </button>
              {previewSrc && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAvatar(null)}>
                  <Trash size={16} aria-hidden="true" />
                  Remove
                </button>
              )}
            </div>
            <span className="muted tiny">PNG, JPEG or WebP. It's cropped to a square.</span>
            <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" onChange={pickImage} hidden />
          </div>
        </div>

        <label className="field">
          Name
          <input
            className="input"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={50}
            placeholder={profile.username}
            autoComplete="name"
          />
          <span className="muted tiny">Shown on your profile, lists and comments. Leave empty to show your nickname.</span>
        </label>

        <label className="field">
          Nickname
          <span className="input-prefix">
            <span aria-hidden="true">@</span>
            <input
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              minLength={3}
              maxLength={24}
              pattern="[A-Za-z0-9_]+"
              title="3–24 letters, numbers and underscores"
              autoComplete="username"
              disabled={nicknameLocked}
              required
            />
          </span>
          <span className="muted tiny">
            Unique. It's your profile link and the name you log in with. You can change it once every 7 days.
          </span>
        </label>
        {nicknameLocked && (
          <p className="notice small">
            <Clock size={18} aria-hidden="true" />
            You changed your nickname recently. You can change it again on {formatDate(profile.usernameChangeAvailableAt)}.
          </p>
        )}
        {!nicknameLocked && nicknameChanged && (
          <p className="notice small">
            <Clock size={18} aria-hidden="true" />
            After this change you won't be able to change your nickname again for 7 days. Log in with the new nickname from
            now on.
          </p>
        )}

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {saved && !dirty && (
          <p className="success" role="status">
            <CheckCircle size={18} aria-hidden="true" />
            Profile saved.
          </p>
        )}
        <div className="row">
          <button className="btn btn-primary" disabled={busy || !dirty}>
            {busy ? 'Saving…' : 'Save changes'}
          </button>
          {dirty && (
            <button type="button" className="btn btn-ghost" onClick={() => load(profile)} disabled={busy}>
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
