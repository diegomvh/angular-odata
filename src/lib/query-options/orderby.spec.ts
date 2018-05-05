import { Order, Orderby } from './orderby';

describe('Orderby', () => {
  it('test toString', () => {
    let property: string;
    let order: Order;
    expect(() => new Orderby(property, order)).toThrowError('property cannot be undefined');
    //
    property = null;
    expect(() => new Orderby(property, order)).toThrowError('property cannot be null');
    //
    property = 'property';
    let orderby: Orderby = new Orderby(property, order);
    expect(orderby.toString()).toEqual('property');
    //
    order = Order.ASC;
    orderby = new Orderby(property, order);
    expect(orderby.toString()).toEqual('property asc');
    //
    order = Order.DESC;
    orderby = new Orderby(property, order);
    expect(orderby.toString()).toEqual('property desc');
  });
});
