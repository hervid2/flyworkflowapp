'use client';
/**
 * Nested sub-modal for managing custom incident categories. Opened from within
 * {@link IssueForm}; closing it reopens the create-issue modal rather than
 * dismissing the whole flow. Categories added here go into {@link useCategoriesStore}
 * and become immediately selectable in the form's real category catalog.
 */
import { useState, useRef, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import { useModalStore } from '@/store/useModalStore';
import { useCategoriesStore } from '@/store/useCategoriesStore';
import styles from './CategoryManagerModal.module.scss';

export default function CategoryManagerModal() {
  const activeModal = useModalStore((s) => s.activeModal);
  const open = useModalStore((s) => s.open);
  const isOpen = activeModal === 'category-manager';

  const categories = useCategoriesStore((s) => s.customTypes);
  const addCategory = useCategoriesStore((s) => s.addCategory);
  const removeCategory = useCategoriesStore((s) => s.removeCategory);
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
    addCategory(trimmed);
    setNewName('');
    inputRef.current?.focus();
  };

  const handleDelete = (id: string) => removeCategory(id);

  const handleClose = () => open('create-issue');

  if (!isOpen) return null;

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Gestionar categorías"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3>Gestionar categorías</h3>
          <button
            type="button"
            className={styles.close}
            onClick={handleClose}
            aria-label="Volver al formulario"
          >
            <X size={16} />
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles['add-row']}>
            <input
              ref={inputRef}
              type="text"
              placeholder="Nueva categoría..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAdd();
                }
              }}
              aria-label="Nombre de la nueva categoría"
            />
            <button type="button" onClick={handleAdd} disabled={!newName.trim()}>
              Agregar
            </button>
          </div>

          <div className={styles.list} role="list" aria-label="Categorías personalizadas">
            {categories.length === 0 ? (
              <p className={styles.empty}>Sin categorías personalizadas</p>
            ) : (
              categories.map((cat) => (
                <div key={cat.id} className={styles.item} role="listitem">
                  <span className={styles.item__name}>{cat.name}</span>
                  <button
                    type="button"
                    className={styles.item__delete}
                    onClick={() => handleDelete(cat.id)}
                    aria-label={`Eliminar categoría ${cat.name}`}
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
