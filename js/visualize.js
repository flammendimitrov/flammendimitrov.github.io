const dateDiv = document.getElementById('current-date');
const date = new Date();

let loading = true;

// delete the saved/outdated data from covid-19.js
corona = null;

const withZeros = (number) => ('0' + number).slice(-2);

const makeDate = (date) => {
  return `${withZeros(date.getDate())}.${withZeros(date.getMonth() + 1)}.${date.getFullYear()} ${withZeros(date.getHours())}:${withZeros(date.getMinutes())}`;
}

dateDiv.innerHTML = makeDate(date);

const selectButtons = () => document.querySelectorAll('#controls button');

const clearVisualization = () => { document.getElementById('visualization').innerHTML = ''; };

const clearActiveButton = () => {
  const buttons = Array.from(selectButtons());

  buttons.forEach((button) => {
    button.classList.remove('active');
  });
};

const addAction = (button) => {
  button.addEventListener('click', (e) => {
    clearActiveButton();
    button.setAttribute('class', 'active');

    clearVisualization();
    drawVisualization(combineData(countryData, corona), button.id);
  });
};

const addActionsToButtons = () => {
  const buttons = Array.from(selectButtons());

  buttons.forEach((button) => {
    if (button.id === "totalCases") {
      button.setAttribute('class', 'active');
    }

    addAction(button);
  });
};

addActionsToButtons();

const format = d3.format(",");

// Set tooltips
const tip = d3.tip()
  .attr('class', 'd3-tip')
  .offset([-10, 0])
  .html(function (d) {
    if (!d.coronaData) {
      return (
        "<div class='country-name'>" + d.properties.name + "</div>" +
        '<div class="population">' + (!d.population ? 'no population data' : format(d.population)) + '</div>' +
        '<div class="no-data">No corona data</div>'
      );
    }

    return (
      '<div class="country-name">' + d.properties.name + '</div>' +
      '<div class="population">' + (!d.population ? 'no population data' : format(d.population)) + '</div>' +
      '<div class="tip-row"><strong>Cases: </strong><span class="details">' + format(d.coronaData.totalCases) + '</span></div>' +
      '<div class="tip-row"><strong>Active cases: </strong><span class="details">' + format(d.coronaData.activeCases) + '</span></div>' +
      '<div class="tip-row"><strong>Per Million: </strong><span class="details">' + format(d.coronaData.perMillion) + '</span></div><br />' +

      '<div class="tip-row"><strong>New Cases: </strong><span class="details">' + (d.coronaData.newCases || 0) + '</span></div>' +
      '<div class="tip-row"><strong>New Deaths: </strong><span class="details">' + (d.coronaData.newDeaths || 0) + '</span></div>' +

      '<div class="tip-row"><strong>Deaths: </strong><span class="details">' + format(d.coronaData.totalDeaths) + '</span></div>' +
      '<div class="tip-row"><strong>Recovered: </strong><span class="details">' + format(d.coronaData.totalRecovered) + '</span></div>'
    );
  });

const margin = { top: 0, right: 0, bottom: 0, left: 0 };
const width = 960 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

const maxPopulation = Math.max(...population.map(country => +country.population));
const maxColorna = !!corona ? Math.max(...corona.data.map(country => +country.totalCases)) : 100000;

const scaleMax = maxColorna;

const makePerMillion = (data, population) => {
  if (!!data && !data.perMillion) {
    data.perMillion = (data.totalCases / (population / 1000000)).toFixed(1);
  }

  return data;
};

const combineData = (countriesData, coronaData, population) => {
  return {
    type: countriesData.type,
    features: countriesData.features.map(country => {
      const countryName = getRightName(country);
      const populationForCountry = getPopulationFor(countryName);

      return {
        ...country,
        coronaData: makePerMillion(getDataForCountry(countryName, coronaData), populationForCountry),
        population: populationForCountry
      };
    })
  };
};

const makeLegend = (dataType, ranges, color, legend) => {
  const legendItems = ranges[dataType].map((rangeItem, i) => {
    return (
      '<span class="legend-item">' +
      '<span class="legend-item__color" style="background-color: ' + color(rangeItem - 1) + '"></span>' +
      '<span style="margin-left: 0.5rem;">' + (i === 0 ? '' : '< ') + rangeItem + '</span>' +
      '</span>'
    );
  });

  return '<div id="legend"><span class="legend">Legend</span>' + legendItems.join(' ') + '</div>';
};

// queue()
//     .defer(d3.json, "world_countries.json")
//     .defer(d3.tsv, "world_population.tsv")
//     .await(ready);

const getDataForCountry = (name, allCountries) => allCountries.data.filter(c => c.name === name)[0];

const getPopulationFor = (name) => {
  const country = population.filter(c => (c.alternativeName === name || c.name === name))[0];
  return !!country ? country.population : 0;
};

const getRightName = (country) => (country.properties.alternativeName || country.properties.name);

const checkMissingCountries = (data, coronaData) => {
  console.log('%cCountries not listed in the corona data', 'color: #11354d; background-color: #d4eeff; padding: 0.2rem 1rem; border-radius: 4px;');

  const countryNames = data.features.map(c => getRightName(c));

  const coronaCountryNames = coronaData.data.map(c => c.name);

  const missingCountries = coronaCountryNames.filter(d => !countryNames.includes(d));

  console.log(missingCountries.join(', '));
};

const get = (countryName, dataType, data) => {
  const country = data.features.filter(c => (c.properties.alternativeName === countryName || c.properties.name === countryName))[0];
  if (!!country.coronaData) {
    return country.coronaData[dataType];
  }
};

const makeGraticule = (svg, graticule, path) => {
  svg.append("path")
    .datum(graticule)
    .attr("class", "graticule")
    .attr("d", path);
};

const makeCountries = (svg, dataType, data, path, color) => {


  svg.append("g")
    .attr("class", "countries")
    .selectAll("path")
    .data(data.features)
    .enter().append("path")
    .attr("d", path)
    .style("fill", function (d) {
      const countryName = getRightName(d);
      return color(get(countryName, dataType, data) || -1);
    })
    .style('stroke', 'white')
    .style('stroke-width', 1.5)
    .style("opacity", 0.8)
    // tooltips
    .style("stroke", "white")
    .style('stroke-width', 0.5)
    .on('mouseover', function (d) {
      tip.show(d);

      d3.select(this)
        .style("opacity", 1)
        .style("stroke", "#555")
        .style("stroke-width", 1);
    })
    .on('mouseout', function (d) {
      tip.hide(d);

      d3.select(this)
        .style("opacity", 0.8)
        .style("stroke", "white")
        .style("stroke-width", 0.3);
    });
};

const makeInfoSource = () => {
  return '<div id="info-source">' +
    '<span id="data-source">Data source: <a href="https://www.worldometers.info/coronavirus/" target="blank">worldometers.info</a></span>' +
    '<span id="data-updated">Data updated: <span>' + makeDate(new Date(corona.updated)) + '</span></span>' +
    '</div>';
};

const makeFooter = (dataType, ranges, color) => {
  const body = document.querySelector('#visualization');

  const legend = document.getElementById('legend');

  const footer = document.createElement('div');
  footer.setAttribute('id', 'footer');

  footer.innerHTML = makeLegend(dataType, ranges, color, legend) + makeInfoSource();

  // body.innerHTML = body.innerHTML + makeLegend(dataType, ranges, color, legend);
  // body.insertAdjacentElement('beforeend', footer);
  body.appendChild(footer);
};

function drawVisualization(data, showDataType) {
  let dataType = showDataType || 'totalCases';

  const ranges = {
    activeCases: [0, 50, 100, 500, 1000, 3000, 5000, 10000, 20000, 50000, scaleMax],
    totalCases: [0, 50, 100, 500, 1000, 3000, 5000, 10000, 20000, 50000, scaleMax],
    totalDeaths: [0, 10, 50, 100, 200, 300, 500, 1000, 2000, 3000, 5000],
    perMillion: [0, 10, 50, 100, 150, 200, 250, 300, 400, 500, 1000]
  };

  const color = d3.scaleThreshold()
    .domain(ranges[dataType])
    .range([
      "hsl(205, 100%, 90%)",
      "hsl(50, 100%, 70%)",
      "hsl(45, 100%, 60%)",
      "hsl(40, 100%, 60%)",
      "hsl(35, 100%, 60%)",
      "hsl(30, 100%, 60%)",
      "hsl(25, 100%, 60%)",
      "hsl(20, 100%, 50%)",
      "hsl(15, 100%, 50%)",
      "hsl(10, 100%, 40%)",
      "hsl(0, 100%, 30%)"
    ]);

  const svg = d3.select("#visualization")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .append('g')
    .attr('class', 'map');

  // var projection = d3.geoInterruptedMollweideHemispheres()
  const projection = d3.geoRobinson()
    .scale(150)
    .translate([width / 2, height / 1.55]);

  const path = d3.geoPath().projection(projection);
  const graticule = d3.geoGraticule10;

  svg.call(tip);

  makeGraticule(svg, graticule, path);

  makeCountries(svg, dataType, data, path, color);

  svg.append("path")
    .datum(topojson.mesh(data.features, function (a, b) { return a.id !== b.id; }))
    // .datum(topojson.mesh(data.features, function(a, b) { return a !== b; }))
    .attr("class", "names")
    .attr("d", path);

  makeFooter(dataType, ranges, color);
}

const showLoading = () => {
  document.getElementById('visualization').innerHTML = '<div id="loading">Loading corona data...</div>';

  // display message if no data after 5 seconds
  const timeoutId = setTimeout(() => {
    if (loading) {
      document.getElementById('visualization').innerHTML = '<div id="loading">No data availiable. Please, try again later</div>';
    }

    clearTimeout(timeoutId);
  }, 5000);
};

showLoading();

const getTotal = (what, coronaData) => {
  return coronaData.data.reduce((sum, country) => (sum + (country[what] || 0)), 0);
};

const getPercentage = (part, total) => ((part / total) * 100).toFixed(1);

const makeWorldWideStats = (coronaData) => {
  const totalCases = getTotal('totalCases', coronaData);
  const totalDeaths = getTotal('totalDeaths', coronaData);
  const deathPercentage = getPercentage(totalDeaths, totalCases);
  const totalRecovered = getTotal('totalRecovered', coronaData);
  const recoveredPercentage = getPercentage(totalRecovered, totalCases);
  const totalActiveCases = getTotal('activeCases',coronaData);
  const totalCriticalCases = getTotal('seriousCritical', coronaData);
  const criticalCasesPercentage = getPercentage(totalCriticalCases, totalActiveCases);

  const worldStats = document.querySelector('#world-stats');

  worldStats.innerHTML = `
    <span class="category">total cases: </span> <span class="value cases">${format(totalCases)}</span>
    <span class="category">active cases: </span> <span class="value active">${format(totalActiveCases)}</span>
    <span class="category">critical cases: </span> <span class="value active">${format(totalCriticalCases)}</span><span class="percentage active">${criticalCasesPercentage}%</span>
    <span class="category">total deaths: </span> <span class="value deaths">${format(totalDeaths)}</span><span class="percentage deaths">${deathPercentage}%</span>
    <span class="category">total recovered: </span> <span class="value recovered">${format(totalRecovered)}</span><span class="percentage recovered">${recoveredPercentage}%</span>
  `;

};

/**
 * Traversing the DOM to get the corona data out of the table
 */
const getCoronaData = (tbody) => {
  const htmlRows = Array.from(tbody.querySelectorAll('tr'));

  const rows = Array.from(htmlRows.map(r => r.cells)).map(row => Array.from(row));

  const data = rows.map(r => r.map(c => c.textContent));

  const countries = data.map((country) => ({
    name: country[0].trim(),
    totalCases: parseFloat(country[1].replace(/,/g, '')),
    newCases: country[2].trim(),
    totalDeaths: parseFloat(country[3].replace(/,/g, '')) || 0,
    newDeaths: country[4].trim(),
    totalRecovered: parseFloat(country[5].replace(/,/g, '')) || 0,
    activeCases: parseFloat(country[6].replace(/,/g, '')) || 0,
    seriousCritical: parseFloat(country[7].replace(/,/g, '')) || 0,
    perMillion: parseFloat(country[8].replace(/,/g, '')) || 0

  }));

  return {
    updated: new Date(),
    data: countries
  };
};

const getTableBody = (data) => {
  const table = data.match(/<table id="main_table_countries_today"[\S+\n\r\s]+<\/table>/)[0];

  // clear the big amount of text (about 2 MB)
  data = '';

  // create temp element so a new element can be created out of the hrml-string
  const containerDiv = document.createElement('div');
  containerDiv.innerHTML = table;

  return containerDiv.querySelector('tbody');
};

const fetchCoronaData = (data) => {
  // prevent the no-data-message show after the data is there
  loading = false;

  corona = getCoronaData(getTableBody(data));

  // clear the big amount of text (about 2 MB)
  data = '';

  // console.log(JSON.stringify(countriesData, null, 2));

  const completeData = combineData(countryData, corona);

  // draw the world's map when the data is there
  clearVisualization();
  drawVisualization(completeData);

  checkMissingCountries(completeData, corona);

  makeWorldWideStats(corona);
};

$.ajax({
  // overcoming CORS with https://cors-anywhere.herokuapp.com/--wished url--
  url: 'https://cors-anywhere.herokuapp.com/https://www.worldometers.info/coronavirus/',
  success: fetchCoronaData
});