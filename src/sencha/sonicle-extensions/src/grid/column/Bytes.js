/*
 * Sonicle ExtJs UX
 * Copyright (C) 2015 Sonicle S.r.l.
 * sonicle@sonicle.com
 * http://www.sonicle.com
 */
Ext.define('Sonicle.grid.column.Bytes', {
	extend: 'Ext.grid.column.Column',
	alias: 'widget.sobytescolumn',
	
	requires: [
		'Sonicle.Bytes'
	],
	producesHTML: false,
	
	/**
	 * @cfg {err|iec|si} [units=null]
	 * Specity unit representation (see {@link Sonicle.Bytes#format}).
	 */
	units: null,
	
	/**
	 * @cfg {String} [separator=null]
	 * Separator to use between value and symbol.
	 */
	separator: null,
	
	align: 'right',
	
	defaultRenderer: function(value) {
		return this.readableBytes(value);
	},
	
	updater: function(cell, value) {
		cell.firstChild.innerHTML = this.readableBytes(value);
	},
	
	privates: {
		readableBytes: function(value) {
			var SoB = Sonicle.Bytes;
			if (Ext.isString(value)) {
				return SoB.format(SoB.parse(value), {units: this.units, separator: this.separator});
			} else {
				return (value === -1) ? '' : SoB.format(value, {units: this.units, separator: this.separator});
			}
		}
	}
});
