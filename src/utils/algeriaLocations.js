let cachedLocations = null;

const buildLocationsMap = (rawCities) => {
  const algeriaCities = Array.isArray(rawCities) ? rawCities : [];

  const wilayaOptions = Object.values(
    algeriaCities.reduce((acc, item) => {
      const wilayaCode = String(item.wilaya_code ?? '').padStart(2, '0');
      if (!wilayaCode || !item.wilaya_name) return acc;

      if (!acc[wilayaCode]) {
        acc[wilayaCode] = {
          wilaya_code: wilayaCode,
          wilaya_name: item.wilaya_name,
        };
      }

      return acc;
    }, {}),
  ).sort((a, b) => a.wilaya_code.localeCompare(b.wilaya_code, 'en'));

  const communesByWilaya = algeriaCities.reduce((acc, item) => {
    const wilayaCode = String(item.wilaya_code ?? '').padStart(2, '0');
    if (!wilayaCode || !item.commune_name) return acc;

    if (!acc[wilayaCode]) {
      acc[wilayaCode] = [];
    }

    if (!acc[wilayaCode].some((entry) => entry.commune_name === item.commune_name)) {
      acc[wilayaCode].push({
        id: item.id,
        commune_name: item.commune_name,
        daira_name: item.daira_name,
      });
    }

    return acc;
  }, {});

  Object.keys(communesByWilaya).forEach((wilayaCode) => {
    communesByWilaya[wilayaCode].sort((a, b) => a.commune_name.localeCompare(b.commune_name, 'ar'));
  });

  const defaultWilayaCode = wilayaOptions[0]?.wilaya_code || '';

  return {
    wilayaOptions,
    communesByWilaya,
    defaultWilayaCode,
  };
};

const loadAlgeriaLocations = async () => {
  if (cachedLocations) {
    return cachedLocations;
  }

  const module = await import('../data/algeria_cities.json');
  const rawCities = module?.default || [];
  cachedLocations = buildLocationsMap(rawCities);
  return cachedLocations;
};

const getWilayaNameByCode = (locations, wilayaCode) =>
  locations?.wilayaOptions?.find((wilaya) => wilaya.wilaya_code === wilayaCode)?.wilaya_name || '';

export { getWilayaNameByCode, loadAlgeriaLocations };
