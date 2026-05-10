import fs from 'fs';

function splitValuesTuple(valuesStr) {
  const result = [];
  let currentWord = '';
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < valuesStr.length; i++) {
    const char = valuesStr[i];
    
    if (escapeNext) {
      currentWord += char;
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      currentWord += char; 
      escapeNext = true;
      continue;
    }

    if (char === "'" && !inString) {
      inString = true;
      currentWord += char;
      continue;
    }

    if (char === "'" && inString) {
      inString = false;
      currentWord += char;
      continue;
    }

    if (char === ',' && !inString) {
      result.push(currentWord.trim());
      currentWord = '';
      continue;
    }

    currentWord += char;
  }
  
  if (currentWord.trim() !== '') {
    result.push(currentWord.trim());
  }
  return result;
}

function parseSqlValue(val) {
  if (val.toUpperCase() === 'NULL') return null;
  if (val.startsWith("'") && val.endsWith("'")) {
    let inner = val.slice(1, -1);
    inner = inner.replace(/\\'/g, "'");
    return inner;
  }
  if (!isNaN(Number(val))) return Number(val);
  return val;
}

function parseSqlInserts(sqlString) {
  const tableData = {};
  const lines = sqlString.split('\n');
  let currentTable = null;
  let columns = [];
  let insertValuesBuffer = '';
  let parsingValues = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('--') || line.startsWith('/*')) continue;

    if (line.startsWith('INSERT INTO')) {
      const tableNameMatch = line.match(/INSERT INTO `([^`]+)`/i);
      if (tableNameMatch) {
         currentTable = tableNameMatch[1];
         if (!tableData[currentTable]) {
           tableData[currentTable] = [];
         }
      }

      const colsPart = line.substring(line.indexOf('(') + 1, line.indexOf(')'));
      columns = colsPart.split(',').map(c => c.trim().replace(/`/g, ''));
      
      const valuesIdx = line.indexOf('VALUES');
      if (valuesIdx !== -1) {
        insertValuesBuffer = line.substring(valuesIdx + 6).trim();
        parsingValues = true;
      }
    } else if (parsingValues) {
      insertValuesBuffer += ' ' + line;
    }

    if (parsingValues && insertValuesBuffer.endsWith(';')) {
      parsingValues = false;
      let allTuples = insertValuesBuffer;
      if (allTuples.endsWith(';')) allTuples = allTuples.slice(0, -1);

      let inString = false;
      let startIdx = -1;
      let escapeNext = false;
      
      for (let j = 0; j < allTuples.length; j++) {
        const char = allTuples[j];
        if (escapeNext) { escapeNext = false; continue; }
        if (char === '\\') { escapeNext = true; continue; }
        if (char === "'") { inString = !inString; continue; }

        if (!inString) {
          if (char === '(') {
            startIdx = j + 1;
          } else if (char === ')' && startIdx !== -1) {
            const rawValues = allTuples.substring(startIdx, j);
            const valList = splitValuesTuple(rawValues);
            
            const rowObj = {};
            columns.forEach((colName, idx) => {
              if (valList[idx] !== undefined) {
                rowObj[colName] = parseSqlValue(valList[idx]);
              }
            });
            tableData[currentTable].push(rowObj);
            startIdx = -1;
          }
        }
      }
      insertValuesBuffer = '';
    }
  }

  return tableData;
}

function parseCovers(str) {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch {
    return str.split(',').map(s => s.trim()).filter(Boolean);
  }
}

function formatSqlValue(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number' || typeof val === 'boolean') return val.toString();
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
  return `'${String(val).replace(/'/g, "''")}'`;
}

function generateInserts(tableName, records) {
  if (!records || records.length === 0) return '';
  const columns = Object.keys(records[0]);
  
  let sql = `INSERT INTO public."${tableName}" ("${columns.join('", "')}") VALUES\n`;
  const values = records.map(record => {
    const rowValues = columns.map(col => formatSqlValue(record[col]));
    return `(${rowValues.join(', ')})`;
  });
  
  sql += values.join(',\n') + ';\n\n';
  return sql;
}

async function start() {
  const sqlInput = fs.readFileSync('/Users/ygs/Downloads/u240376517_propdb (3).sql', 'utf8');
  console.log("Parsing MySQL dump file...");
  const data = parseSqlInserts(sqlInput);
  
  let outputSql = '-- Supabase Custom PostgreSQL Import Data\n\n';

  // 1. network_users
  if (data['network_users'] && data['network_users'].length > 0) {
    const cleanUsers = data['network_users'].map(u => ({
      id: u.id,
      name: u.name,
      phone: u.phone,
      pin: '1234',
      firm_name: u.firm_name,
      area_covers: parseCovers(u.area_covers),
      city_covers: parseCovers(u.city_covers),
      default_area: u.default_area,
      default_city: u.default_city,
      default_type: u.default_type,
      token: u.token,
      created_on: u.created_on,
      default_unit: u.default_unit || 'Gaj',
      default_privacy: u.default_privacy === '1' ? 'private' : 'public',
    }));
    outputSql += generateInserts('network_users', cleanUsers);
  }

  // 2. network_properties
  if (data['network_properties'] && data['network_properties'].length > 0) {
    const cleanProps = data['network_properties'].map(p => ({
      id: p.id,
      owner_id: p.owner_id,
      city: p.city,
      area: p.area,
      type: p.type,
      description: p.description,
      note_private: p.note_private,
      size_min: p.size_min,
      size_max: p.size_max,
      size_unit: p.size_unit,
      price_min: p.price_min,
      price_max: p.price_max,
      location: p.location,
      location_accuracy: p.location_accuracy,
      landmark_location: p.landmark_location,
      landmark_location_distance: p.landmark_location_distance,
      is_public: p.is_public === 1,
      tags: p.tags,
      highlights: p.highlights,
      public_rating: p.public_rating,
      my_rating: p.my_rating,
      created_on: p.created_on,
      updated_on: p.updated_on,
    }));
    outputSql += generateInserts('network_properties', cleanProps);
  }

  // 3. network_favorites
  if (data['network_property_fav'] && data['network_property_fav'].length > 0) {
    const cleanFavs = data['network_property_fav'].map(f => ({
      id: f.id,
      user_id: f.user_id,
      property_id: f.property_id,
      user_note: f.user_note,
      is_favourite: f.is_favourite === 1,
      created_on: f.created_at,
    }));
    outputSql += generateInserts('network_favorites', cleanFavs);
  }
  
  // Re-adjust sequence value so next INSERT doesn't fail due to duplicate primary key
  outputSql += `
-- Reset sequences
SELECT setval('network_users_id_seq', (SELECT MAX(id) FROM public.network_users));
SELECT setval('network_properties_id_seq', (SELECT MAX(id) FROM public.network_properties));
SELECT setval('network_favorites_id_seq', (SELECT MAX(id) FROM public.network_favorites));
`;

  fs.writeFileSync('supabase_import_data.sql', outputSql);
  console.log("Successfully generated supabase_import_data.sql!");
}

start().catch(console.error);
