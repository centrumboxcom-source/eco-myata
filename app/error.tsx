'use client';
export default function Error({reset}:{reset:()=>void}){return <main className="empty-state" style={{minHeight:'80vh'}}><h1>Не вдалося завантажити сторінку</h1><p>Спробуйте ще раз за мить.</p><button className="button" onClick={reset}>Спробувати ще раз</button><a href="/">На головну</a></main>}
