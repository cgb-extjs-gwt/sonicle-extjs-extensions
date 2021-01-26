/*
 * Sonicle ExtJs UX
 * Copyright (C) 2015 Sonicle S.r.l.
 * sonicle@sonicle.com
 * http://www.sonicle.com
 */
Ext.define('Sonicle.form.field.VTypes', {
	override: 'Ext.form.field.VTypes',
	
	username: function(v) {
		return this.usernameRe.test(v);
	},
	usernameRe: /^[a-z][a-z0-9\.\-\_]+$/i,
	usernameText: 'This should be a valid username',
	
	complexPassword: function(v) {
		var me = this, count = 0;
		if (me.complexPasswordLwLRe.test(v)) count++;
		if (me.complexPasswordUpLRe.test(v)) count++;
		if (me.complexPasswordNumRe.test(v)) count++;
		if (me.complexPasswordSpeRe.test(v)) count++;
		return (count >= 3);
	},
	//complexPasswordLenRe: /^[\s\S]{8,128}$/,
	complexPasswordLwLRe: /.*[a-z].*/,
	complexPasswordUpLRe: /.*[A-Z].*/,
	complexPasswordNumRe: /.*[0-9].*/,
	complexPasswordSpeRe: /.*[^a-zA-Z0-9].*/,
	complexPasswordText: 'Password must at least three of the following four categories: uppercase latin letters, lowercase latin letters, numbers, special characters'
});
