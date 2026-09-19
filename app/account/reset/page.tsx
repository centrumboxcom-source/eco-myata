'use client';
import {useState} from 'react';
import {browserClient} from '@/lib/supabase-browser';
import {Header,Footer} from '@/components/shop';
export default function Page(){const [message,setMessage]=useState('');return <><Header/><main className="auth-card"><h1>Новий пароль</h1><form onSubmit={async e=>{e.preventDefault();const client=browserClient();if(!client){setMessage('Сервіс ще не налаштовано.');return}const password=String(new FormData(e.currentTarget).get('password'));const {error}=await client.auth.updateUser({password});setMessage(error?'Посилання недійсне або прострочене. Запросіть нове.':'Пароль оновлено. Можете перейти до особистого кабінету.')}}><label className="field">Новий пароль<input name="password" type="password" minLength={8} required autoComplete="new-password"/></label><button className="button">Зберегти пароль</button><p role="status">{message}</p></form></main><Footer/></>}
