import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Chat, ChatStatus } from '../types/chat';

export const useSupportChats = (statusFilter?: ChatStatus[]) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let q = query(
      collection(db, 'supportChats'),
      orderBy('updatedAt', 'desc')
    );

    if (statusFilter && statusFilter.length > 0) {
      q = query(
        collection(db, 'supportChats'),
        where('status', 'in', statusFilter),
        orderBy('updatedAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Chat[];
      
      setChats(chatsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [JSON.stringify(statusFilter)]);

  return { chats, loading };
};
