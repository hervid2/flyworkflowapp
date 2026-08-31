'use client';
/**
 * Drag-and-drop attachment picker for the create form. Splits uploads into
 * media vs. document tabs (each with its own accepted MIME types), previews
 * images as thumbnails, and lifts the chosen `File[]` to the parent form.
 * Accepted types mirror the backend's real allowlist exactly
 * (media.constants.ts) — offering a type the server would reject anyway
 * (SVG, AVI, XLS/XLSX) just produces a confusing failure after upload starts.
 */
import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, X, FileText, Video, Check, AlertCircle, Loader2 } from 'lucide-react';
import type { Media } from '@/domain/models';
import styles from './FileUploader.module.scss';

type FileTab = 'media' | 'documents';

const MEDIA_ACCEPT = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],
  'video/mp4': ['.mp4'],
  'video/quicktime': ['.mov'],
  'video/webm': ['.webm'],
};

const DOCUMENT_ACCEPT = {
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
};

/** True for images/videos; documents fall into the other tab. */
const isMediaFile = (f: File) => f.type.startsWith('image/') || f.type.startsWith('video/');

interface Props {
  value: File[];
  onChange: (files: File[]) => void;
  /** Per-file upload outcome, set once the parent starts uploading after creating the incident. */
  statuses?: Map<File, Media['status']>;
  /** Disables adding/removing files while an upload pass is in progress. */
  uploading?: boolean;
}

export default function FileUploader({ value, onChange, statuses, uploading }: Props) {
  const t = useTranslations('createIssue');
  const [activeTab, setActiveTab] = useState<FileTab>('media');

  const displayedFiles =
    activeTab === 'media' ? value.filter(isMediaFile) : value.filter((f) => !isMediaFile(f));

  const onDrop = useCallback(
    (accepted: File[]) => {
      onChange([...value, ...accepted]);
    },
    [value, onChange],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: activeTab === 'media' ? MEDIA_ACCEPT : DOCUMENT_ACCEPT,
    multiple: true,
    disabled: uploading,
  });

  const removeFile = (target: File) => {
    onChange(value.filter((f) => f !== target));
  };

  return (
    <div className={styles.uploader}>
      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <div
        className={styles.uploader__tabs}
        role="tablist"
        aria-label={t('fileUploader.tabsAriaLabel')}
      >
        {(['media', 'documents'] as FileTab[]).map((tab) => (
          <button
            key={tab}
            role="tab"
            type="button"
            aria-selected={activeTab === tab}
            className={`${styles.uploader__tab} ${activeTab === tab ? styles['uploader__tab--active'] : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'media' ? t('fileUploader.mediaTab') : t('fileUploader.documentsTab')}
          </button>
        ))}
      </div>

      {/* ── Dropzone ──────────────────────────────────────────────────────── */}
      <div
        {...getRootProps()}
        className={`${styles.uploader__dropzone} ${isDragActive ? styles['uploader__dropzone--active'] : ''}`}
        aria-label={
          activeTab === 'media'
            ? t('fileUploader.dropzoneMediaAriaLabel')
            : t('fileUploader.dropzoneDocumentsAriaLabel')
        }
      >
        <input {...getInputProps()} />
        <UploadCloud size={24} className={styles.uploader__upload_icon} aria-hidden />
        <p className={styles.uploader__hint}>
          {isDragActive ? t('fileUploader.dropHint') : t('fileUploader.dragHint')}
        </p>
        <p className={styles.uploader__formats}>
          {activeTab === 'media'
            ? t('fileUploader.mediaFormats')
            : t('fileUploader.documentFormats')}
        </p>
      </div>

      {/* ── Preview grid / empty state ────────────────────────────────────── */}
      {displayedFiles.length === 0 ? (
        <p className={styles.uploader__empty} aria-live="polite">
          {t('fileUploader.empty')}
        </p>
      ) : (
        <ul
          className={styles.uploader__grid}
          role="list"
          aria-label={t('fileUploader.previewAriaLabel')}
        >
          {displayedFiles.map((file, i) => {
            const status = statuses?.get(file);
            return (
              <li key={`${file.name}-${i}`} className={styles.uploader__item}>
                {file.type.startsWith('image/') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className={styles.uploader__thumbnail}
                  />
                ) : (
                  <div className={styles.uploader__file_icon} aria-hidden="true">
                    {file.type.startsWith('video/') ? <Video size={20} /> : <FileText size={20} />}
                  </div>
                )}
                <p className={styles.uploader__filename} title={file.name}>
                  {file.name}
                </p>
                {status === 'pending' && (
                  <span
                    className={styles['uploader__status-badge']}
                    aria-label={t('fileUploader.uploading')}
                  >
                    <Loader2 size={12} className={styles['uploader__status-spinner']} />
                  </span>
                )}
                {status === 'uploaded' && (
                  <span
                    className={`${styles['uploader__status-badge']} ${styles['uploader__status-badge--ok']}`}
                    aria-label={t('fileUploader.uploaded')}
                  >
                    <Check size={12} />
                  </span>
                )}
                {status === 'error' && (
                  <span
                    className={`${styles['uploader__status-badge']} ${styles['uploader__status-badge--error']}`}
                    aria-label={t('fileUploader.uploadError')}
                    title={t('fileUploader.uploadError')}
                  >
                    <AlertCircle size={12} />
                  </span>
                )}
                {!uploading && (
                  <button
                    type="button"
                    className={styles.uploader__remove}
                    onClick={() => removeFile(file)}
                    aria-label={t('fileUploader.remove', { name: file.name })}
                  >
                    <X size={12} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
