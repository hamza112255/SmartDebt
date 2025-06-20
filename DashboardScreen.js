import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export default function DashboardScreen({ user }) {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      // Use user.id to filter data
      let { data: filteredData, error } = await supabase
        .from('your_table') // replace with your table name
        .select('*')
        .eq('user_id', user.id);

      if (!error) setData(filteredData);
      // handle error as needed
    };

    if (user?.id) {
      fetchData();
    }
  }, [user]);

  return (
    <div>
      {/* ...existing code to render data... */}
    </div>
  );
}