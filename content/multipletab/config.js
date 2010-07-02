const XULAppInfo = Components.classes['@mozilla.org/xre/app-info;1']
		.getService(Components.interfaces.nsIXULAppInfo);
const comparator = Components.classes['@mozilla.org/xpcom/version-comparator;1']
					.getService(Components.interfaces.nsIVersionComparator);

Components.utils.import('resource://multipletab-modules/extensions.js', {});
Components.utils.import('resource://multipletab-modules/namespace.jsm');
var extensions = getNamespaceFor('piro.sakura.ne.jp')['piro.sakura.ne.jp'].extensions;

const MENU_EDITOR_ID = '{EDA7B1D7-F793-4e03-B074-E6F303317FB0}';

var gAutoPopupItems = [];
var gDelayItems = [];
var gDragModeRadio;

function init()
{
	[
		'menuEditorLink-selection',
		'menuEditorLink-context'
	].forEach(function(aItem) {
		aItem = document.getElementById(aItem);
		aItem.setAttribute('collapsed', true);
		extensions.isInstalled(MENU_EDITOR_ID, { ng : function() {
			aItem.removeAttribute('collapsed');
		}});
	});

	[
		'menuEditorConfig-selection',
		'menuEditorConfig-context'
	].forEach(function(aItem) {
		aItem = document.getElementById(aItem);
		aItem.setAttribute('collapsed', true);
		aItem.setAttribute('disabled', true);
		extensions.isInstalled(MENU_EDITOR_ID, { ok : function() {
			aItem.removeAttribute('collapsed');
		}});
		extensions.isEnabled(MENU_EDITOR_ID, { ok : function() {
			aItem.removeAttribute('disabled');
		}});
	});


	[
		{
			ids   : ['printalltabs@peculier.com'],
			items : ['extensions.multipletab.show.multipletab-selection-printTabs-check']
		},
		{
			ids   : [
				'{dc572301-7619-498c-a57d-39143191b318}', // Tab Mix Plus
				'tabutils@ithinc.cn' // Tab Utilities
			],
			items : [
				'extensions.multipletab.show.multipletab-selection-freezeTabs-check',
				'extensions.multipletab.show.multipletab-selection-protectTabs-check'
			]
		},
		{
			ids   : [
				'{dc572301-7619-498c-a57d-39143191b318}', // Tab Mix Plus
				'tabutils@ithinc.cn', // Tab Utilities
				'{752a85d4-68d6-48ae-ab7d-6640f5f75d85}' // Super Tab Mode
			],
			items : [
				'extensions.multipletab.show.multipletab-selection-lockTabs-check'
			]
		}
	].forEach(function(aDefinition) {
		var items = aDefinition.items.map(document.getElementById, document);
		items.forEach(function(aItem) {
			aItem.setAttribute('disabled', true);
		});
		aDefinition.ids.forEach(function(aId) {
			extensions.isAvailable(aId, { ok : function() {
				aItem.removeAttribute('disabled');
			}});
		});
	});

	new window['piro.sakura.ne.jp'].arrowScrollBoxScrollHelper('formatTypeBox', 'radio');
	new window['piro.sakura.ne.jp'].arrowScrollBoxScrollHelper('selectionMenuItemsBox', 'checkbox');
	new window['piro.sakura.ne.jp'].arrowScrollBoxScrollHelper('contextMenuItemsBox', 'checkbox');

//	sizeToContent();
}

function initGeneralPane()
{
	gDragModeRadio = document.getElementById('extensions.multipletab.tabdrag.mode-radiogroup');

	gDelayItems.push(document.getElementById('extensions.multipletab.tabdrag.delay-textbox'));
	gDelayItems.push(gDelayItems[0].previousSibling);
	gDelayItems.push(gDelayItems[0].nextSibling);

	gAutoPopupItems.push(document.getElementById('extensions.multipletab.tabdrag.autopopup-check'));
	gAutoPopupItems.push(document.getElementById('extensions.multipletab.tabdrag.autoclear-check'));

	onDragModeChange();
}

function onDragModeChange()
{
	gDelayItems.forEach(function(aItem) {
		if (gDragModeRadio.value == 0)
			aItem.setAttribute('disabled', true);
		else
			aItem.removeAttribute('disabled');
	});
	gAutoPopupItems.forEach(function(aItem) {
		if (gDragModeRadio.value == 1)
			aItem.removeAttribute('disabled');
		else
			aItem.setAttribute('disabled', true);
	});
}

function openMenuEditorConfig()
{
	extensions.goToOptions(MENU_EDITOR_ID, window);
}



const kROW_ID_PREFIX = 'format-';

var gFormatsPref;
var gFormatsBox;
var gFormatsRadio;
var gFormatTemplate;
var gAddFormatButton;
var gUndoRemoveFormatButton;
var gFormatsUndoCache = [];

function initClipboardPane()
{
	gFormatsPref     = document.getElementById('extensions.multipletab.clipboard.formats');
	gFormatsBox      = document.getElementById('formats-box');
	gFormatsRadio    = document.getElementById('extensions.multipletab.clipboard.formatType-radiogroup');
	gFormatTemplate  = document.getElementById('format-template');
	gAddFormatButton = document.getElementById('formats-add');
	gUndoRemoveFormatButton = document.getElementById('formats-undo');

	initCustomFormats();
	gFormatsRadio.value = document.getElementById('extensions.multipletab.clipboard.formatType').value;
}

function getRowById(aID)
{
	return document.getElementById(kROW_ID_PREFIX+aID);
}
function getRadioFromRow(aRow)
{
	return aRow.getElementsByTagName('radio')[0];
}
function getLabelFieldFromRow(aRow)
{
	return aRow.getElementsByTagName('textbox')[0];
}
function getFormatFieldFromRow(aRow)
{
	return aRow.getElementsByTagName('textbox')[1];
}

function removeFormat(aRow)
{
	var id           = getRadioFromRow(aRow).getAttribute('value');
	var selected     = parseInt(gFormatsRadio.value);
	var selectedItem = gFormatsRadio.selectedItem;

	var cache = {
			id     : id,
			label  : getLabelFieldFromRow(aRow).value,
			format : getFormatFieldFromRow(aRow).value
		};
	if (cache.label || cache.format) {
		gFormatsUndoCache.push(cache);
		gUndoRemoveFormatButton.removeAttribute('disabled');
	}

	var nextRow = aRow.nextSibling;
	while (nextRow)
	{
		let radio = getRadioFromRow(nextRow);
		let id = radio.getAttribute('value');
		id = parseInt(id)-1;
		radio.setAttribute('value', id);
		nextRow.setAttribute('id', kROW_ID_PREFIX+id);
		nextRow = nextRow.nextSibling;
	}
	gFormatsBox.removeChild(aRow);

	if (selected == id) {
		gFormatsRadio.value = -1;
		cache.selected = true;
	}
	else if (selected >= 1000) {
		gFormatsRadio.selectedItem = selectedItem;
	}

	updateCustomFormats();
}

function undoRemoveFormat()
{
	if (!gFormatsUndoCache.length) return;

	var cache = gFormatsUndoCache.pop();
	var newRow = addNewFormat(cache.label, cache.format);

	var row = getRowById(cache.id);
	if (row && row != newRow) {
		(function(aRow) {
			let nextRow = aRow.nextSibling;
			if (!nextRow) return;

			arguments.callee(nextRow);

			getLabelFieldFromRow(nextRow).value = getLabelFieldFromRow(aRow).value;
			getFormatFieldFromRow(nextRow).value = getFormatFieldFromRow(aRow).value;

			if (!cache.selected) {
				let radio = getRadioFromRow(aRow);
				if (radio == gFormatsRadio.selectedItem)
					gFormatsRadio.selectedItem = getRadioFromRow(nextRow);
			}
		})(row);
		getLabelFieldFromRow(row).value = cache.label;
		getFormatFieldFromRow(row).value = cache.format;
		if (cache.selected)
			gFormatsRadio.selectedItem = getRadioFromRow(row);
	}

	updateCustomFormats();

	if (!gFormatsUndoCache.length)
		gUndoRemoveFormatButton.setAttribute('disabled', true);
}

function addNewFormat(aLabel, aFormat)
{
	var id = parseInt(getRadioFromRow(gFormatsBox.lastChild).getAttribute('value')) + 1;

	var newRow = gFormatTemplate.cloneNode(true);
	getRadioFromRow(newRow).setAttribute('value', id);
	newRow.setAttribute('id', kROW_ID_PREFIX+id);

	gFormatsBox.appendChild(newRow);

	var radio = getRadioFromRow(newRow);
	if (gFormatsRadio.mRadioChildren) gFormatsRadio.mRadioChildren = null; // for Firefox 2

	if (aLabel) {
		getLabelFieldFromRow(newRow).value = aLabel;
	}
	if (aFormat) {
		getFormatFieldFromRow(newRow).value = aFormat;
		onFormatInput(newRow);
	}

	if (!aLabel && !aFormat) {
		window.setTimeout(function() {
			getLabelFieldFromRow(newRow).focus();
			updateCustomFormats();
		}, 0);
	}

	return newRow;
}

function updateCustomFormats()
{
	var value = [];
	var row = gFormatTemplate.nextSibling;
	while (row)
	{
		value.push(
			[
				getFormatFieldFromRow(row).value,
				getLabelFieldFromRow(row).value
			]
			.map(encodeURIComponent)
			.join('/')
		);
		row = row.nextSibling;
	}
	value = value.join('|')
			.replace(/[\|\/]+$/, ''); // delete last blank rows
	if (value != gFormatsPref.value)
		gFormatsPref.value = value;
}

function initCustomFormats()
{
	var range = document.createRange();
	range.selectNodeContents(gFormatsBox);
	range.setStartAfter(gFormatTemplate);
	range.deleteContents();
	range.detach();
	var value = gFormatsPref.value
		.replace(/[\|\/]+$/, ''); // delete last blank rows
	if (!value) return;
	value.split('|')
		.forEach(function(aFormat) {
			let format, label;
			[format, label] = aFormat.split('/').map(decodeURIComponent);
			addNewFormat(label, format);
		});
}

function onFormatInput(aRow)
{
	var radio = getRadioFromRow(aRow);
	var format = getFormatFieldFromRow(aRow);
	if (format.value) {
		radio.removeAttribute('disabled');
	}
	else {
		radio.setAttribute('disabled', true);
		if (radio == gFormatsRadio.selectedItem)
			gFormatsRadio.value = -1;
	}
}
