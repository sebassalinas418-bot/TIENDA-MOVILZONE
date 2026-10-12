"use client";

type StoreAuthContactFieldsProps = {
  mode: "login" | "register";
  name: string;
  onName: (value: string) => void;
  identifier: string;
  onIdentifier: (value: string) => void;
  email: string;
  onEmail: (value: string) => void;
  phone: string;
  onPhone: (value: string) => void;
  password: string;
  onPassword: (value: string) => void;
  inputClassName: string;
  labelClassName: string;
};

export function StoreAuthContactFields({
  mode,
  name,
  onName,
  identifier,
  onIdentifier,
  email,
  onEmail,
  phone,
  onPhone,
  password,
  onPassword,
  inputClassName,
  labelClassName,
}: StoreAuthContactFieldsProps) {
  return (
    <>
      {mode === "register" ? (
        <label className={labelClassName}>
          Nombre
          <input
            type="text"
            name="name"
            autoComplete="name"
            value={name}
            onChange={(event) => onName(event.target.value)}
            required
            className={inputClassName}
          />
        </label>
      ) : null}

      {mode === "login" ? (
        <label className={labelClassName}>
          Correo o celular
          <input
            type="text"
            name="identifier"
            autoComplete="username"
            inputMode="email"
            value={identifier}
            onChange={(event) => onIdentifier(event.target.value)}
            required
            placeholder="mail@correo.com o 11 1234-5678"
            className={inputClassName}
          />
        </label>
      ) : (
        <>
          <label className={labelClassName}>
            Correo <span className="font-normal text-slate-400">(opcional si cargás celular)</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(event) => onEmail(event.target.value)}
              className={inputClassName}
            />
          </label>
          <label className={labelClassName}>
            Celular <span className="font-normal text-slate-400">(opcional si cargás correo)</span>
            <input
              type="tel"
              name="phone"
              autoComplete="tel"
              inputMode="tel"
              value={phone}
              onChange={(event) => onPhone(event.target.value)}
              placeholder="11 1234-5678"
              className={inputClassName}
            />
          </label>
        </>
      )}

      <label className={labelClassName}>
        Contraseña
        <input
          type="password"
          name="password"
          autoComplete={mode === "register" ? "new-password" : "current-password"}
          value={password}
          onChange={(event) => onPassword(event.target.value)}
          required
          className={inputClassName}
        />
      </label>
    </>
  );
}
