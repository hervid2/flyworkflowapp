'use client';
/**
 * `/ajustes` content: two independent forms — profile (name, avatar URL) and
 * password change — each with its own submit/error/success state. Profile
 * fields are seeded from the auth store via React Hook Form's `values` option
 * so they re-sync once `hydrateFromCookie` resolves after mount (this is a
 * client component, so `user` starts out `null` on first render). On a
 * successful profile save, `updateUser` patches the store in place so the
 * TopBar/sidebar avatar and name update without a refetch.
 */
import { useMemo, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/store/useAuthStore';
import { updateProfile, changePassword } from '@/services/settings.service';
import { ApiError } from '@/lib/api-client';
import {
  createProfileFormSchema,
  createPasswordFormSchema,
  type ProfileFormValues,
  type PasswordFormValues,
} from '@/lib/validators/settings.schema';
import styles from './SettingsView.module.scss';

type SubmitStatus = 'idle' | 'success' | 'error';

export default function SettingsView() {
  const t = useTranslations('ajustes');
  const tValidation = useTranslations('validation');
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  const profileSchema = useMemo(() => createProfileFormSchema(tValidation), [tValidation]);
  const passwordSchema = useMemo(() => createPasswordFormSchema(tValidation), [tValidation]);

  const [profileStatus, setProfileStatus] = useState<SubmitStatus>('idle');
  const [passwordStatus, setPasswordStatus] = useState<SubmitStatus>('idle');
  const [passwordErrorMessage, setPasswordErrorMessage] = useState('');

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors, isSubmitting: isSavingProfile },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema) as Resolver<ProfileFormValues>,
    values: { name: user?.name ?? '', avatarUrl: user?.avatarUrl ?? '' },
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors, isSubmitting: isSavingPassword },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema) as Resolver<PasswordFormValues>,
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  async function onSubmitProfile(values: ProfileFormValues) {
    setProfileStatus('idle');
    try {
      const updated = await updateProfile({
        name: values.name,
        avatarUrl: values.avatarUrl ? values.avatarUrl : null,
      });
      updateUser(updated);
      setProfileStatus('success');
    } catch {
      setProfileStatus('error');
    }
  }

  async function onSubmitPassword(values: PasswordFormValues) {
    setPasswordStatus('idle');
    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      resetPasswordForm();
      setPasswordStatus('success');
    } catch (err) {
      setPasswordErrorMessage(
        err instanceof ApiError && err.status === 401
          ? t('passwordErrorWrongCurrent')
          : t('passwordError'),
      );
      setPasswordStatus('error');
    }
  }

  return (
    <section className={styles.section} aria-label={t('sectionAriaLabel')}>
      <div className={styles.header}>
        <h1 className={styles.header__title}>{t('pageTitle')}</h1>
        <p className={styles.header__subtitle}>{t('pageSubtitle')}</p>
      </div>

      <div className={styles.cards}>
        <form
          className={styles.card}
          onSubmit={handleProfileSubmit(onSubmitProfile, () => setProfileStatus('idle'))}
          noValidate
        >
          <div className={styles.card__header}>
            <h2 className={styles.card__title}>{t('profileTitle')}</h2>
            <p className={styles.card__subtitle}>{t('profileSubtitle')}</p>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="settings-name">
              {t('labelName')}
            </label>
            <input
              id="settings-name"
              className={`${styles.input}${profileErrors.name ? ` ${styles['input--error']}` : ''}`}
              {...registerProfile('name')}
              aria-invalid={!!profileErrors.name}
              aria-describedby={profileErrors.name ? 'settings-name-error' : undefined}
            />
            {profileErrors.name && (
              <p id="settings-name-error" className={styles.error} role="alert">
                {profileErrors.name.message}
              </p>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="settings-email">
              {t('labelEmail')}
            </label>
            <input
              id="settings-email"
              className={styles.input}
              value={user?.email ?? ''}
              disabled
              readOnly
            />
            <p className={styles.hint}>{t('emailHint')}</p>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="settings-avatar-url">
              {t('labelAvatarUrl')}
            </label>
            <input
              id="settings-avatar-url"
              className={`${styles.input}${profileErrors.avatarUrl ? ` ${styles['input--error']}` : ''}`}
              placeholder={t('avatarUrlPlaceholder')}
              {...registerProfile('avatarUrl')}
              aria-invalid={!!profileErrors.avatarUrl}
              aria-describedby={profileErrors.avatarUrl ? 'settings-avatar-url-error' : undefined}
            />
            {profileErrors.avatarUrl && (
              <p id="settings-avatar-url-error" className={styles.error} role="alert">
                {profileErrors.avatarUrl.message}
              </p>
            )}
          </div>

          {user && (
            <div className={styles.metaRow}>
              <span className={styles.metaItem}>
                <span className={styles.metaItem__label}>{t('roleLabel')}</span> {user.role}
              </span>
            </div>
          )}

          <div className={styles.card__footer}>
            {profileStatus === 'success' && (
              <p className={styles.success} role="status">
                {t('profileSuccess')}
              </p>
            )}
            {profileStatus === 'error' && (
              <p className={styles.error} role="alert">
                {t('profileError')}
              </p>
            )}
            <button type="submit" className={styles.submitBtn} disabled={isSavingProfile || !user}>
              {isSavingProfile ? t('savingProfile') : t('saveProfile')}
            </button>
          </div>
        </form>

        <form
          className={styles.card}
          onSubmit={handlePasswordSubmit(onSubmitPassword, () => setPasswordStatus('idle'))}
          noValidate
        >
          <div className={styles.card__header}>
            <h2 className={styles.card__title}>{t('passwordTitle')}</h2>
            <p className={styles.card__subtitle}>{t('passwordSubtitle')}</p>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="settings-current-password">
              {t('labelCurrentPassword')}
            </label>
            <input
              id="settings-current-password"
              type="password"
              autoComplete="current-password"
              className={`${styles.input}${passwordErrors.currentPassword ? ` ${styles['input--error']}` : ''}`}
              {...registerPassword('currentPassword')}
              aria-invalid={!!passwordErrors.currentPassword}
              aria-describedby={
                passwordErrors.currentPassword ? 'settings-current-password-error' : undefined
              }
            />
            {passwordErrors.currentPassword && (
              <p id="settings-current-password-error" className={styles.error} role="alert">
                {passwordErrors.currentPassword.message}
              </p>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="settings-new-password">
              {t('labelNewPassword')}
            </label>
            <input
              id="settings-new-password"
              type="password"
              autoComplete="new-password"
              className={`${styles.input}${passwordErrors.newPassword ? ` ${styles['input--error']}` : ''}`}
              {...registerPassword('newPassword')}
              aria-invalid={!!passwordErrors.newPassword}
              aria-describedby={
                passwordErrors.newPassword ? 'settings-new-password-error' : undefined
              }
            />
            {passwordErrors.newPassword && (
              <p id="settings-new-password-error" className={styles.error} role="alert">
                {passwordErrors.newPassword.message}
              </p>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="settings-confirm-password">
              {t('labelConfirmPassword')}
            </label>
            <input
              id="settings-confirm-password"
              type="password"
              autoComplete="new-password"
              className={`${styles.input}${passwordErrors.confirmPassword ? ` ${styles['input--error']}` : ''}`}
              {...registerPassword('confirmPassword')}
              aria-invalid={!!passwordErrors.confirmPassword}
              aria-describedby={
                passwordErrors.confirmPassword ? 'settings-confirm-password-error' : undefined
              }
            />
            {passwordErrors.confirmPassword && (
              <p id="settings-confirm-password-error" className={styles.error} role="alert">
                {passwordErrors.confirmPassword.message}
              </p>
            )}
          </div>

          <div className={styles.card__footer}>
            {passwordStatus === 'success' && (
              <p className={styles.success} role="status">
                {t('passwordSuccess')}
              </p>
            )}
            {passwordStatus === 'error' && (
              <p className={styles.error} role="alert">
                {passwordErrorMessage}
              </p>
            )}
            <button type="submit" className={styles.submitBtn} disabled={isSavingPassword}>
              {isSavingPassword ? t('savingPassword') : t('savePassword')}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
