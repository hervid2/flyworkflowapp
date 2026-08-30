'use client';
/**
 * Login screen. Validates credentials with React Hook Form + Zod, calls the
 * real auth service, persists the session via the auth store, and redirects
 * to the map. Includes accessibility hooks (aria-invalid/alert).
 */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { login } from '@/services/auth.service';
import { useAuthStore } from '@/store/useAuthStore';
import { ApiError } from '@/lib/api-client';
import FlyIcon from '@/components/ui/FlyIcon';
import styles from './Login.module.scss';

// Local schema — only shape-validates the inputs; real auth happens in the service.
const loginSchema = z.object({
  email: z.string().email('Introduce un email válido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

type LoginForm = z.infer<typeof loginSchema>;

function mapLoginError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return 'Credenciales inválidas. Verifica tu email y contraseña.';
    if (err.status === 429)
      return 'Demasiados intentos. Espera un momento antes de volver a intentarlo.';
  }
  return 'No se pudo iniciar sesión. Intenta de nuevo.';
}

export default function LoginPage() {
  const router = useRouter();
  const loginAction = useAuthStore((s) => s.login);
  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  // Authenticate, store the session, then navigate; surface failures inline.
  const onSubmit = async (data: LoginForm) => {
    setServerError('');
    try {
      const { user, accessToken } = await login(data.email, data.password);
      loginAction(user, accessToken);
      router.push('/mapa');
    } catch (err) {
      setServerError(mapLoginError(err));
    }
  };

  return (
    <div className={styles.login} role="main">
      <div className={styles.login__card}>
        <div className={styles.login__header}>
          <span className={styles.login__logo} aria-label="FlyWorkFlow">
            <FlyIcon size={28} />
            FlyWorkFlow
          </span>
          <h1 className={styles.login__title}>Gestión de Incidencias</h1>
          <p className={styles.login__subtitle}>Inicia sesión para continuar</p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className={styles.login__form}
          noValidate
          aria-label="Formulario de inicio de sesión"
        >
          <div className={styles.login__field}>
            <label htmlFor="email" className={styles.login__label}>
              Email
            </label>
            <input
              id="email"
              type="email"
              className={`${styles.login__input} ${errors.email ? styles['login__input--error'] : ''}`}
              placeholder="usuario@empresa.com"
              autoComplete="email"
              aria-describedby={errors.email ? 'email-error' : undefined}
              aria-invalid={!!errors.email}
              {...register('email')}
            />
            {errors.email && (
              <span id="email-error" className={styles.login__error} role="alert">
                {errors.email.message}
              </span>
            )}
          </div>

          <div className={styles.login__field}>
            <label htmlFor="password" className={styles.login__label}>
              Contraseña
            </label>
            <div className={styles.login__password_wrap}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className={`${styles.login__input} ${errors.password ? styles['login__input--error'] : ''}`}
                placeholder="••••••••"
                autoComplete="current-password"
                aria-describedby={errors.password ? 'password-error' : undefined}
                aria-invalid={!!errors.password}
                {...register('password')}
              />
              <button
                type="button"
                className={styles.login__eye_btn}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && (
              <span id="password-error" className={styles.login__error} role="alert">
                {errors.password.message}
              </span>
            )}
          </div>

          {serverError && (
            <div className={styles.login__server_error} role="alert" aria-live="assertive">
              {serverError}
            </div>
          )}

          <button
            type="submit"
            className={styles.login__submit}
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? 'Iniciando sesión…' : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}
