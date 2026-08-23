'use client';
/**
 * Nested sub-modal for managing custom incident categories. Opened from within
 * {@link IssueForm}; closing it reopens the create-issue modal rather than
 * dismissing the whole flow. Added categories persist for the browser session.
 */
import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { X, Trash2 } from 'lucide-react';
import { useModalStore } from '@/store/useModalStore';
import styles from './CategoryManagerModal.module.scss';

interface Category {
  id: string;
  name: string;
}

// Module-scoped list so custom categories survive remounts within a session.
const sessionCategories: Category[] = [];

export default function CategoryManagerModal() {
  const t = useTranslations('createIssue');
  const activeModal = useModalStore((s) => s.activeModal);
  const open = useModalStore((s) => s.open);
  const isOpen = activeModal === 'category-manager';

  const [categories, setCategories] = useState<Category[]>(sessionCategories);
  const [newName, setNewName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        open('create-issue');
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, open]);

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const cat: Category = { id: crypto.randomUUID(), name: trimmed };
    const next = [...categories, cat];
    setCategories(next);
    sessionCategories.length = 0;
    sessionCategories.push(...next);
    setNewName('');
    inputRef.current?.focus();
  };

  const handleDelete = (id: string) => {
    const next = categories.filter((c) => c.id !== id);
    setCategories(next);
    sessionCategories.length = 0;
    sessionCategories.push(...next);
  };

  const handleClose = () => open('create-issue');

  if (!isOpen) return null;

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label={t('categoryManager.ariaLabel')}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3>{t('categoryManager.title')}</h3>
          <button
            type="button"
            className={styles.close}
            onClick={handleClose}
            aria-label={t('categoryManager.close')}
          >
            <X size={16} />
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles['add-row']}>
            <input
              ref={inputRef}
              type="text"
              placeholder={t('categoryManager.newCategoryPlaceholder')}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAdd();
                }
              }}
              aria-label={t('categoryManager.newCategoryAriaLabel')}
            />
            <button type="button" onClick={handleAdd} disabled={!newName.trim()}>
              {t('categoryManager.add')}
            </button>
          </div>

          <div className={styles.list} role="list" aria-label={t('categoryManager.listAriaLabel')}>
            {categories.length === 0 ? (
              <p className={styles.empty}>{t('categoryManager.empty')}</p>
            ) : (
              categories.map((cat) => (
                <div key={cat.id} className={styles.item} role="listitem">
                  <span className={styles.item__name}>{cat.name}</span>
                  <button
                    type="button"
                    className={styles.item__delete}
                    onClick={() => handleDelete(cat.id)}
                    aria-label={t('categoryManager.deleteCategory', { name: cat.name })}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
