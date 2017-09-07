import extManager from '../extManager';

const {util} = tui;
/**
 * TSV chart data parser
 * consumes tab separated values and make data/options for tui chart
 *
 * ```chart
 * \t범례1\t범례2
 * 1월\t21\t23
 * 2월\t351\t45
 *
 * width: 700
 * height: 300
 * title: Monthly Revenue
 * format: 1000
 * x.title: Amount
 * x.min: 0
 * x.max 9000
 * x.suffix: $
 * y.title: Month
```
 * @class TSVChartParser
 */
class TSVChartParser {
    static parse(code) {
        return new TSVChartParser().parse(code);
    }

    /**
     * parse tsv chart code into tui chart data and options
     * @param {string} code - tsv data/options code
     * @returns {object} - tui chart data & options
     * @memberof TSVChartParser
     */
    parse(code) {
        code = code.replace(/^\n+/, '');

        const [dataCode, optionCode] = code.split(/\n{2,}/);
        const data = this.tsvDataParser(dataCode);
        const options = this.tsvOptionParser(optionCode);

        return {
            data,
            options
        };
    }

    /**
     * parse tsv chart data
     * @param {string} dataCode - tsv data code
     * @returns {object} - tui chart data object
     * @memberof TSVChartParser
     */
    tsvDataParser(dataCode) {
        const series = [];
        const categories = [];
        const dataLines = dataCode.split('\n').filter(line => line.length > 0);
        const legendLine = dataLines.shift();
        const legends = legendLine.split('\t');
        const hasCategory = legends[0].length === 0;

        if (hasCategory) {
            legends.shift();
        }

        for (let i = 0; i < legends.length; i += 1) {
            series[i] = {
                name: legends[i],
                data: []
            };
        }

        // parse series
        dataLines.forEach(line => {
            const lineData = line.split('\t');
            if (hasCategory) {
                categories.push(lineData.shift());
            }

            for (let i = 0; i < legends.length; i += 1) {
                series[i].data.push(lineData[i]);
            }
        });

        return {
            categories,
            series
        };
    }

    /**
     * parse options
     * @param {string} optionCode - options code
     * @returns {object} - tui chart options
     * @memberof TSVChartParser
     */
    tsvOptionParser(optionCode) {
        if (util.isUndefined(optionCode)) {
            return {};
        }

        const options = {};
        const optionLines = optionCode.split('\n');

        optionLines.forEach(line => {
            let [key, ...value] = line.split(':');
            value = value.join(':');
            if (value.length === 0) {
                return;
            }

            // parse keys
            let [key1, key2] = key.split('.');
            // short names
            if (util.isUndefined(key2)) {
                key2 = key1;
                key1 = 'chart';
            } else {
                key1 = key1 === 'x' ? 'xAxis' : key1;
                key1 = key1 === 'y' ? 'yAxis' : key1;
            }

            try {
                value = JSON.parse(value);
            } catch (e) {
                value = value.trim();
            }

            options[key1] = options[key1] || {};
            options[key1][key2] = value;
        });

        return options;
    }
}

/**
 * chart plugin
 * @param {Editor} editor - editor
 * @param {object} [pluginOptions={}] - plugin options
 * @param {Array<string>} pluginOptions.languages - language names to map
 * @ignore
 */
function chartPlugin(editor, pluginOptions = {}) {
    const codeBlockManager = editor.convertor.getCodeBlockManager();
    const {
        languages = ['chart', 'chart:bar', 'chart:line', 'chart:column', 'chart:area', 'chart:pie']
    } = pluginOptions;

    /**
     * replace html from chart data
     * @param {string} codeBlockChartData - chart data text
     * @param {string} language - language
     * @returns {string} - rendered html
     */
    function chartReplacer(codeBlockChartData, language) {
        const randomId = `chart-${Math.random().toString(36).substr(2, 10)}`;
        const renderedHTML = `<div id="${randomId}" class="chart" />`;

        let [, chartType] = language.split(':');
        chartType = util.isUndefined(chartType) ? 'bar' : chartType;

        const {data, options} = TSVChartParser.parse(codeBlockChartData);

        setTimeout(() => {
            const chartContainer = document.querySelector(`#${randomId}`);
            try {
                tui.chart[`${chartType}Chart`](chartContainer, data, options);
            } catch (e) {
                chartContainer.innerText = 'invalid chart data';
            }
        }, 0);

        return renderedHTML;
    }

    languages.forEach(language => codeBlockManager.setReplacer(language, chartReplacer));
}

extManager.defineExtension('chart', chartPlugin);
