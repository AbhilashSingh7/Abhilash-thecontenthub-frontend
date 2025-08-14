
import React from 'react';
import { Link } from 'react-router-dom';

export default function CommentsList({ reviews }) {
  if (!reviews?.length) return <div>No comments yet.</div>;
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {reviews.map(r => (
        <div key={r.id} style={{ padding: 12, border: '1px solid #eee', borderRadius: 8 }}>
          <div style={{ marginBottom: 6 }}>
            {/* authorId comes from backend transform */}
            <Link to={`/profile/${r.authorId}`} style={{ fontWeight: 600, textDecoration: 'none' }}>
              {r.author}
            </Link>
          </div>
          <div>{r.content}</div>
        </div>
      ))}
    </div>
  );
}
