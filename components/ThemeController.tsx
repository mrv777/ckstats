'use client';

import { useEffect, useState } from 'react';

const themes = ['light', 'dark', 'cupcake'];

export default function ThemeController() {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTheme = e.target.value;
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <div className="dropdown dropdown-end">
      <label tabIndex={0} className="btn m-1">
        Theme
      </label>
      <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
        {themes.map((t) => (
          <li key={t}>
            <a onClick={() => handleThemeChange({ target: { value: t } } as any)}>{t}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}