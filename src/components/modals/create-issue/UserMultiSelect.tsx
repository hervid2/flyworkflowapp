'use client';
/**
 * Searchable multi-select for people (the caller's own organization — a
 * session only ever sees one). Used for both the assignees and observers
 * fields; matches on name/email and returns the selected user ids to the
 * form. Selected users surface as removable chips.
 */
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, X } from 'lucide-react';
import type { UserRef } from '@/domain/models';
import styles from './UserMultiSelect.module.scss';

interface Props {
  users: UserRef[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  'aria-label'?: string;
}

export default function UserMultiSelect({
  users,
  selectedIds,
  onChange,
  placeholder,
  'aria-label': ariaLabel,
}: Props) {
  const t = useTranslations('createIssue');
  const effectivePlaceholder = placeholder ?? t('userMultiSelect.defaultPlaceholder');
  const [search, setSearch] = useState('');

  const toggle = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onChange(Array.from(next));
  };

  const q = search.toLowerCase();
  const filtered = users.filter(
    (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
  );

  const selectedUsers = users.filter((u) => selectedIds.includes(u.id));

  const initials = (name: string) =>
    name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase();

  return (
    <div className={styles.root} aria-label={ariaLabel}>
      {selectedUsers.length > 0 && (
        <div
          className={styles.chips}
          role="list"
          aria-label={t('userMultiSelect.selectedAriaLabel')}
        >
          {selectedUsers.map((u) => (
            <span key={u.id} className={styles.chip} role="listitem">
              {u.name}
              <button
                type="button"
                className={styles.chip__remove}
                aria-label={t('userMultiSelect.remove', { name: u.name })}
                onClick={() => toggle(u.id)}
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className={styles.panel}>
        <div className={styles.search}>
          <input
            type="text"
            placeholder={effectivePlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label={effectivePlaceholder}
          />
        </div>

        <div className={styles.list} role="listbox" aria-multiselectable="true">
          {filtered.length === 0 ? (
            <p className={styles.empty}>{t('userMultiSelect.noResults')}</p>
          ) : (
            filtered.map((user) => {
              const selected = selectedIds.includes(user.id);
              return (
                <div
                  key={user.id}
                  className={[styles.option, selected ? styles['option--selected'] : ''].join(' ')}
                  role="option"
                  aria-selected={selected}
                  onClick={() => toggle(user.id)}
                >
                  {user.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.avatarUrl} alt={user.name} className={styles.option__avatar} />
                  ) : (
                    <span className={styles['option__avatar-placeholder']}>
                      {initials(user.name)}
                    </span>
                  )}
                  <div className={styles.option__info}>
                    <span className={styles.option__name}>{user.name}</span>
                  </div>
                  {selected && (
                    <Check size={14} className={styles.option__check} aria-hidden="true" />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
